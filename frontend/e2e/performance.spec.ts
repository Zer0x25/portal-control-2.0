import { expect, test, type Page } from "@playwright/test";
import { loginFast } from "./helpers/auth-helper";
import { attachPerformanceReport, summarizePerformance } from "./helpers/performance-metrics";
import performanceRouteDefinitions from "../performance-routes.json" with { type: "json" };

const viewport = { width: 1440, height: 900 };
const baseUrl = process.env.E2E_BASE_URL || "http://127.0.0.1:5174";

test.describe.serial("Render Performance", () => {
  test.use({ viewport });
  test.setTimeout(180_000);

  test.beforeEach(async ({ page, request }) => {
    await loginFast(page, request, "admin");
  });

  test("Dashboard does not eagerly load the Time Control route bundle", async ({
    page,
  }, testInfo) => {
    const scriptRequests: string[] = [];
    page.on("request", (request) => {
      if (request.resourceType() === "script") scriptRequests.push(request.url());
    });

    await page.goto(`${baseUrl}/#/dashboard`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("main-content")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("server-clock")).toBeVisible({ timeout: 30_000 });

    const scriptResources = await page.evaluate(() => {
      const resources = performance
        .getEntriesByType("resource")
        .filter((entry): entry is PerformanceResourceTiming => {
          return (
            entry.initiatorType === "script" && new URL(entry.name).pathname.includes("/assets/")
          );
        });
      return {
        assets: resources.map((resource) => new URL(resource.name).pathname.split("/").pop()),
        transferBytes: resources.reduce((total, resource) => total + resource.transferSize, 0),
        encodedBodyBytes: resources.reduce(
          (total, resource) => total + resource.encodedBodySize,
          0,
        ),
      };
    });
    const eagerTimeControlChunks = scriptRequests.filter((url) =>
      /\/assets\/TimeControl\.container-[^/?]+\.js(?:[?#]|$)/.test(url),
    );
    const eagerSecondaryModalChunks = scriptRequests.filter((url) =>
      /\/assets\/(QuickNotesModal\.container|ShiftReportModal|exportToPdf|forms|sanitization)-[^/?]+\.js(?:[?#]|$)/.test(
        url,
      ),
    );
    const report = {
      capturedAt: new Date().toISOString(),
      baseUrl,
      viewport,
      route: "/#/dashboard",
      scriptRequestCount: scriptRequests.length,
      scriptResources,
      eagerTimeControlChunks,
      eagerSecondaryModalChunks,
    };

    await attachPerformanceReport(testInfo, "dashboard-eager-chunks.json", report);
    expect(
      eagerTimeControlChunks,
      "Dashboard should not download the full Time Control route for closed modals",
    ).toEqual([]);
    expect(
      eagerSecondaryModalChunks,
      "Dashboard should defer secondary modal controllers and their optional libraries",
    ).toEqual([]);
  });

  test("Dashboard startup avoids the kiosk list and repeated API reads", async ({
    page,
  }, testInfo) => {
    const apiPaths: string[] = [];
    const inFlight = new Set<string>();
    let lastApiActivity = Date.now();
    const trackRequest = (request: import("@playwright/test").Request) => {
      const url = new URL(request.url());
      if (!url.pathname.startsWith("/api/")) return;
      apiPaths.push(url.pathname);
      inFlight.add(request.url());
      lastApiActivity = Date.now();
    };
    const finishRequest = (request: import("@playwright/test").Request) => {
      if (!inFlight.delete(request.url())) return;
      lastApiActivity = Date.now();
    };
    page.on("request", trackRequest);
    page.on("requestfinished", finishRequest);
    page.on("requestfailed", finishRequest);

    await page.goto(`${baseUrl}/#/dashboard`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("main-content")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("server-clock")).toBeVisible({ timeout: 30_000 });

    const quietDeadline = Date.now() + 15_000;
    while (Date.now() < quietDeadline) {
      if (inFlight.size === 0 && Date.now() - lastApiActivity >= 800) break;
      await page.waitForTimeout(100);
    }

    const requestCounts = new Map<string, number>();
    for (const apiPath of apiPaths) {
      requestCounts.set(apiPath, (requestCounts.get(apiPath) ?? 0) + 1);
    }
    const duplicateEndpoints = [...requestCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([path, count]) => ({ path, count }));
    const report = {
      capturedAt: new Date().toISOString(),
      baseUrl,
      route: "/#/dashboard",
      apiRequestCount: apiPaths.length,
      uniqueApiEndpointCount: requestCounts.size,
      duplicateEndpoints,
      apiPaths,
    };
    await attachPerformanceReport(testInfo, "dashboard-startup-api-requests.json", report);

    expect(inFlight.size, "Dashboard API requests should settle after startup").toBe(0);
    expect(apiPaths, "the public kiosk list belongs only to kiosk mode").not.toContain(
      "/api/employees/kiosk",
    );
    expect(apiPaths.length, "baseline Dashboard startup used 32 API requests").toBeLessThan(32);
    expect(
      duplicateEndpoints.length,
      "baseline Dashboard startup repeated 11 endpoint paths",
    ).toBeLessThan(11);
    expect(
      duplicateEndpoints.filter(({ path }) => path !== "/api/health"),
      "only the independent instance-validation and health-indicator checks may still repeat",
    ).toEqual([]);
  });

  test("Audit Logs virtualized scrolling frame distribution", async ({ page }, testInfo) => {
    await page.goto("/#/admin/governance?tab=audit");
    await expect(page.getByText(/visor de auditoría/i)).toBeVisible({ timeout: 30_000 });

    const scrollContainer = page.locator("div.overflow-y-auto.relative").first();
    await expect(scrollContainer).toBeVisible();

    const measurement = await scrollContainer.evaluate(async (element) => {
      const originalScrollTop = element.scrollTop;
      const originalScrollBehavior = element.style.scrollBehavior;
      const frameIntervals: number[] = [];
      let scrollEventCount = 0;
      const onScroll = () => {
        scrollEventCount += 1;
      };

      element.style.scrollBehavior = "auto";
      element.scrollTop = 0;
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      const scrollRangePx = Math.max(0, element.scrollHeight - element.clientHeight);
      const renderedRows = element.querySelectorAll('div[style*="translateY"]').length;
      const frameSteps = 30;

      const runSweep = (direction: 1 | -1, capture: boolean) =>
        new Promise<void>((resolve) => {
          let previousFrame: number | undefined;
          let step = 0;

          const onFrame = (timestamp: number) => {
            if (capture && previousFrame !== undefined) {
              frameIntervals.push(timestamp - previousFrame);
            }
            previousFrame = timestamp;

            if (step >= frameSteps) {
              resolve();
              return;
            }

            step += 1;
            const progress = step / frameSteps;
            element.scrollTop =
              direction === 1 ? progress * scrollRangePx : (1 - progress) * scrollRangePx;
            requestAnimationFrame(onFrame);
          };

          requestAnimationFrame(onFrame);
        });

      element.addEventListener("scroll", onScroll, { passive: true });
      try {
        // Warm the virtual list before collecting three measured sweeps.
        await runSweep(1, false);
        await runSweep(-1, false);
        await runSweep(1, true);
        await runSweep(-1, true);
        await runSweep(1, true);
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      } finally {
        element.removeEventListener("scroll", onScroll);
        element.style.scrollBehavior = originalScrollBehavior;
        element.scrollTop = originalScrollTop;
      }

      return { scrollRangePx, renderedRows, scrollEventCount, frameIntervals };
    });

    const frameStats = summarizePerformance(measurement.frameIntervals);
    const framesOver50Ms = measurement.frameIntervals.filter((interval) => interval > 50).length;
    const report = {
      capturedAt: new Date().toISOString(),
      baseUrl,
      viewport,
      route: "/#/admin/governance?tab=audit",
      scrollRangePx: Number(measurement.scrollRangePx.toFixed(2)),
      renderedRows: measurement.renderedRows,
      scrollEventCount: measurement.scrollEventCount,
      frameIntervalMs: frameStats,
      framesOver50Ms,
      framesOver50MsPercent: Number(
        ((framesOver50Ms / measurement.frameIntervals.length) * 100).toFixed(2),
      ),
      attentionP95Ms: 50,
      failureP95Ms: 250,
    };

    await attachPerformanceReport(testInfo, "audit-scroll-frame-metrics.json", report);

    expect(
      measurement.renderedRows,
      "Audit list must render rows to measure virtualization",
    ).toBeGreaterThan(0);
    expect(
      measurement.scrollRangePx,
      "Audit list must have vertical overflow to measure scrolling",
    ).toBeGreaterThan(0);
    expect(
      measurement.scrollEventCount,
      "Measured sweeps must dispatch scroll events",
    ).toBeGreaterThan(0);
    expect(measurement.frameIntervals.length).toBeGreaterThanOrEqual(60);

    if (frameStats.p95Ms > 50) {
      console.warn(
        `[PERF] Audit scroll p95 ${frameStats.p95Ms}ms exceeds the 50ms attention target`,
      );
    }
    expect(
      frameStats.p95Ms,
      "Audit scroll frame gaps must remain below the severe-stall limit",
    ).toBeLessThan(250);
  });

  test("Governance tab transition timing", async ({ page }, testInfo) => {
    await page.goto("/#/admin/governance?tab=integrity");
    await expect(page.getByText(/INTEGRA|DEGRADADA/)).toBeVisible({ timeout: 30_000 });

    const samples: Array<{ transition: string; elapsedMs: number }> = [];
    for (let index = 0; index < 5; index += 1) {
      const toSecurity = index % 2 === 0;
      const targetTab = toSecurity ? "Seguridad" : "Integridad";
      const targetContent = toSecurity
        ? page.getByText(/Vigilancia & Riesgos/i)
        : page.getByText(/INTEGRA|DEGRADADA/);
      const startedAt = performance.now();

      await page.getByRole("tab", { name: targetTab, exact: true }).click();
      await expect(targetContent).toBeVisible({ timeout: 30_000 });

      samples.push({
        transition: toSecurity ? "integrity-to-security" : "security-to-integrity",
        elapsedMs: Number((performance.now() - startedAt).toFixed(2)),
      });
    }

    const repeatedStats = summarizePerformance(samples.slice(1).map((sample) => sample.elapsedMs));
    const report = {
      capturedAt: new Date().toISOString(),
      baseUrl,
      viewport,
      route: "/#/admin/governance",
      firstTransition: samples[0],
      repeatedTransitions: samples.slice(1),
      repeatedStats,
    };

    await attachPerformanceReport(testInfo, "governance-tab-metrics.json", report);
    expect(Math.max(...samples.map((sample) => sample.elapsedMs))).toBeLessThan(15_000);
  });
});

type PerformanceProbe =
  | {
      id: string;
      kind: "search";
      placeholder: string;
      emptyText: string;
    }
  | {
      id: string;
      kind: "tabs";
      control: "role-tab" | "button";
      baseline: string;
      baselineContentText?: string;
      steps: Array<{
        label: string;
        contentText?: string;
        contentTestId?: string;
      }>;
    }
  | {
      id: string;
      kind: "modal";
      openButton: string;
      heading: string;
      closeButton: string;
      closedPanelClass: string;
    };

type PerformanceRoute = {
  id: string;
  path: string;
  currentPath: string | null;
  role: "admin" | "worker" | null;
  family: string;
  readiness: "shell" | "kiosk" | "login";
  lighthouse: boolean;
  probes?: PerformanceProbe[];
};

const criticalRoutes = performanceRouteDefinitions as PerformanceRoute[];

const readyLocatorForRoute = (page: Page, route: PerformanceRoute) => {
  if (route.readiness === "kiosk") return page.getByTestId("kiosk-step");
  if (route.readiness === "login") return page.locator("#username");
  if (!route.currentPath) throw new Error(`${route.id} requires a currentPath for shell readiness`);
  return page.locator(
    `[data-testid="app-shell"][data-current-path="${route.currentPath}"] [data-testid="main-content"]`,
  );
};

const runInteractionProbe = async (page: Page, probe: PerformanceProbe) => {
  const samplesMs: number[] = [];
  const repetitions = 3;

  if (probe.kind === "search") {
    const input = page.getByPlaceholder(probe.placeholder, { exact: true });
    const emptyState = page.getByText(probe.emptyText, { exact: true });
    await expect(input).toBeVisible();

    for (let index = 0; index < repetitions; index += 1) {
      const startedAt = performance.now();
      await input.fill(`__perf_no_match_${Date.now()}_${index}__`);
      await expect(emptyState).toBeVisible();
      samplesMs.push(Number((performance.now() - startedAt).toFixed(2)));
      await input.fill("");
    }
  } else if (probe.kind === "modal") {
    for (let index = 0; index < repetitions; index += 1) {
      const startedAt = performance.now();
      await page.getByRole("button", { name: probe.openButton, exact: true }).click();
      await expect(page.getByRole("heading", { name: probe.heading, exact: true })).toBeVisible();
      samplesMs.push(Number((performance.now() - startedAt).toFixed(2)));
      await page.getByRole("button", { name: probe.closeButton, exact: true }).click();
      const panel = page
        .getByRole("heading", { name: probe.heading, exact: true })
        .locator("xpath=../../..");
      await expect(panel).toHaveClass(new RegExp(probe.closedPanelClass));
    }
  } else {
    const getControl = (label: string) =>
      probe.control === "role-tab"
        ? page.getByRole("tab", { name: label, exact: true })
        : page.getByRole("button", { name: label, exact: true });
    const assertStepContent = async (step: (typeof probe.steps)[number]) => {
      if (step.contentTestId)
        await expect(page.getByTestId(step.contentTestId).first()).toBeVisible();
      if (step.contentText)
        await expect(page.getByText(step.contentText, { exact: true }).first()).toBeVisible();
    };

    for (const step of probe.steps) {
      const control = getControl(step.label);
      for (let index = 0; index < repetitions; index += 1) {
        const startedAt = performance.now();
        await control.click();
        await assertStepContent(step);
        if (probe.control === "role-tab")
          await expect(control).toHaveAttribute("aria-selected", "true");
        samplesMs.push(Number((performance.now() - startedAt).toFixed(2)));

        const baselineControl = getControl(probe.baseline);
        await baselineControl.click();
        if (probe.control === "role-tab") {
          await expect(baselineControl).toHaveAttribute("aria-selected", "true");
        } else if (probe.baselineContentText) {
          await expect(
            page.getByText(probe.baselineContentText, { exact: true }).first(),
          ).toBeVisible();
        }
      }
    }
  }

  return {
    id: probe.id,
    kind: probe.kind,
    samplesMs,
    ...summarizePerformance(samplesMs),
  };
};

test("critical route readiness samples", async ({ browser, request }, testInfo) => {
  test.setTimeout(180_000);
  const samplesPerRoute = 3;
  const routeResults: Array<{
    id: string;
    samplesMs: number[];
    medianMs: number;
    maxMs: number;
  }> = [];

  for (const route of criticalRoutes) {
    const samplesMs: number[] = [];
    for (let sampleIndex = 0; sampleIndex < samplesPerRoute; sampleIndex += 1) {
      const context = await browser.newContext({ viewport });
      try {
        const page = await context.newPage();
        if (route.role) await loginFast(page, request, route.role);

        const startedAt = performance.now();
        await page.goto(`${baseUrl}${route.path}`, { waitUntil: "domcontentloaded" });
        const ready = readyLocatorForRoute(page, route);
        await expect(ready).toBeVisible({ timeout: 30_000 });

        samplesMs.push(Number((performance.now() - startedAt).toFixed(2)));
      } finally {
        await context.close();
      }
    }

    const stats = summarizePerformance(samplesMs);
    routeResults.push({
      id: route.id,
      path: route.path,
      role: route.role ?? "anonymous",
      family: route.family,
      samplesMs,
      medianMs: stats.medianMs,
      maxMs: stats.maxMs,
    });
  }

  const report = {
    capturedAt: new Date().toISOString(),
    baseUrl,
    viewport,
    samplesPerRoute,
    readinessMetric: "domcontentloaded until the route's primary content is visible",
    buildCommit: process.env.PERFORMANCE_SOURCE_SHA ?? null,
    routes: routeResults,
  };

  await attachPerformanceReport(testInfo, "critical-route-readiness.json", report);
  for (const route of routeResults) {
    console.info(
      `[PERF] ${route.id} ready median=${route.medianMs}ms max=${route.maxMs}ms samples=${route.samplesMs.join(",")}`,
    );
    expect(route.maxMs, `${route.id} must not exceed the severe route stall limit`).toBeLessThan(
      15_000,
    );
  }
});

test("shared interaction pattern timings", async ({ browser, request }, testInfo) => {
  test.setTimeout(180_000);
  const routesWithProbes = criticalRoutes.filter((route) => route.probes?.length);
  const probeResults: Array<Record<string, unknown>> = [];

  for (const route of routesWithProbes) {
    const context = await browser.newContext({ viewport });
    try {
      const page = await context.newPage();
      if (route.role) await loginFast(page, request, route.role);
      await page.goto(`${baseUrl}${route.path}`, { waitUntil: "domcontentloaded" });
      await expect(readyLocatorForRoute(page, route)).toBeVisible({ timeout: 30_000 });

      for (const probe of route.probes ?? []) {
        const result = await runInteractionProbe(page, probe);
        probeResults.push({
          routeId: route.id,
          path: route.path,
          family: route.family,
          role: route.role ?? "anonymous",
          ...result,
        });
      }
    } finally {
      await context.close();
    }
  }

  const report = {
    capturedAt: new Date().toISOString(),
    baseUrl,
    viewport,
    repetitionsPerInteraction: 3,
    dataMutation: false,
    routes: probeResults,
  };
  await attachPerformanceReport(testInfo, "shared-interaction-metrics.json", report);

  for (const result of probeResults) {
    const maxMs = result.maxMs as number;
    expect(
      maxMs,
      `${result.routeId as string}/${result.id as string} interaction stall`,
    ).toBeLessThan(15_000);
  }
});
