import { performance } from "node:perf_hooks";
import { expect, test, type Page, type Request } from "@playwright/test";
import { loginFast } from "./helpers/auth-helper";
import { attachPerformanceReport, summarizePerformance } from "./helpers/performance-metrics";
import performanceRouteDefinitions from "../performance-routes.json" with { type: "json" };

const viewport = { width: 1440, height: 900 };
const baseUrl = process.env.E2E_BASE_URL || "http://127.0.0.1:5174";
const captureActiveEmployeeFilterProbe =
  process.env.PERFORMANCE_ACTIVE_EMPLOYEE_FILTER_PROBE === "1";
const autoStartSchedulingApiPaths = new Set([
  "/api/configs/global_max_hours",
  "/api/configs/area_list",
  "/api/configs/workday_types",
  "/api/configs/email_recipients",
  "/api/configs/accounting_lock_date",
  "/api/shifts/patterns",
  "/api/shifts/assignments",
  "/api/holidays",
  "/api/leaves",
  "/api/corrections",
]);
type DashboardBootstrapAuditState = {
  events: { type: "visible" | "removed"; atMs: number; rootChildren: number }[];
  paints: { name: string; startTime: number }[];
  lcpEntries: {
    startTime: number;
    size: number;
    elementTag: string | null;
    isBootstrapShell: boolean;
  }[];
};

test.describe.serial("Render Performance", () => {
  test.use({ viewport });
  test.setTimeout(180_000);

  test.beforeEach(async ({ page, request }) => {
    await loginFast(page, request, "admin");
  });

  test("Dashboard bootstrap paints before React and releases after the live clock appears", async ({
    browser,
    request,
  }, testInfo) => {
    const coldViewport = { width: 412, height: 823 };
    const samples: {
      sample: number;
      fcpMs: number | null;
      lcpMs: number | null;
      bootstrapLcpMs: number | null;
      lcpElement: string | null;
      reactRootChildrenAtShellPaint: number | null;
      liveClockVisibleAtMs: number;
      shellVisibleAtMs: number | null;
      shellRemovedAtMs: number | null;
    }[] = [];

    for (let sample = 1; sample <= 3; sample++) {
      const context = await browser.newContext({
        viewport: coldViewport,
        deviceScaleFactor: 1.75,
        isMobile: true,
        hasTouch: true,
        timezoneId: "America/Santiago",
      });
      try {
        const page = await context.newPage();
        await loginFast(page, request, "admin");
        await page.addInitScript(() => {
          const audit: DashboardBootstrapAuditState = {
            events: [],
            paints: [],
            lcpEntries: [],
          };
          (
            window as Window & { __dashboardBootstrapAudit?: typeof audit }
          ).__dashboardBootstrapAudit = audit;
          let wasVisible = false;
          let wasRemoved = false;
          const recordShell = () => {
            const shell = document.getElementById("dashboard-bootstrap-shell");
            const isVisible =
              shell !== null &&
              !shell.hidden &&
              getComputedStyle(shell).display !== "none" &&
              getComputedStyle(shell).visibility !== "hidden";
            if (isVisible && !wasVisible) {
              audit.events.push({
                type: "visible",
                atMs: performance.now(),
                rootChildren: document.getElementById("root")?.childElementCount ?? -1,
              });
              wasVisible = true;
            } else if (!shell && wasVisible && !wasRemoved) {
              audit.events.push({
                type: "removed",
                atMs: performance.now(),
                rootChildren: document.getElementById("root")?.childElementCount ?? -1,
              });
              wasRemoved = true;
            }
          };
          new MutationObserver(recordShell).observe(document, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["hidden", "style", "class"],
          });
          new PerformanceObserver((list) => {
            audit.paints.push(
              ...list
                .getEntries()
                .map((entry) => ({ name: entry.name, startTime: entry.startTime })),
            );
          }).observe({ type: "paint", buffered: true });
          new PerformanceObserver((list) => {
            audit.lcpEntries.push(
              ...list.getEntries().map((entry) => {
                const lcpEntry = entry as PerformanceEntry & {
                  size: number;
                  element: Element | null;
                };
                return {
                  startTime: lcpEntry.startTime,
                  size: lcpEntry.size,
                  elementTag: lcpEntry.element?.tagName ?? null,
                  isBootstrapShell: Boolean(
                    lcpEntry.element?.closest("#dashboard-bootstrap-shell"),
                  ),
                };
              }),
            );
          }).observe({ type: "largest-contentful-paint", buffered: true });
        });

        const cdp = await context.newCDPSession(page);
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
        await page.goto(`${baseUrl}/#/dashboard`, { waitUntil: "domcontentloaded" });
        await expect(page.locator('#root [data-testid="server-clock"]')).toBeVisible({
          timeout: 30_000,
        });
        const liveClockVisibleAtMs = await page.evaluate(() => performance.now());
        await page.waitForTimeout(250);

        const metrics = await page.evaluate(() => {
          const audit = (
            window as Window & { __dashboardBootstrapAudit?: DashboardBootstrapAuditState }
          ).__dashboardBootstrapAudit;
          const fcp = audit?.paints.find((entry) => entry.name === "first-contentful-paint");
          const lcp = audit?.lcpEntries.at(-1);
          const bootstrapLcp = audit?.lcpEntries.find((entry) => entry.isBootstrapShell);
          return {
            fcpMs: fcp?.startTime ?? null,
            lcpMs: lcp?.startTime ?? null,
            bootstrapLcpMs: bootstrapLcp?.startTime ?? null,
            lcpElement: lcp?.elementTag ?? null,
            auditEvents: audit?.events ?? [],
          };
        });
        samples.push({
          sample,
          fcpMs: metrics.fcpMs,
          lcpMs: metrics.lcpMs,
          bootstrapLcpMs: metrics.bootstrapLcpMs,
          lcpElement: metrics.lcpElement,
          liveClockVisibleAtMs,
          shellVisibleAtMs:
            metrics.auditEvents.find((event) => event.type === "visible")?.atMs ?? null,
          reactRootChildrenAtShellPaint:
            metrics.auditEvents.find((event) => event.type === "visible")?.rootChildren ?? null,
          shellRemovedAtMs:
            metrics.auditEvents.find((event) => event.type === "removed")?.atMs ?? null,
        });
      } finally {
        await context.close();
      }
    }

    const fcpSamples = samples.flatMap((sample) => (sample.fcpMs === null ? [] : [sample.fcpMs]));
    const lcpSamples = samples.flatMap((sample) => (sample.lcpMs === null ? [] : [sample.lcpMs]));
    const bootstrapLcpSamples = samples.flatMap((sample) =>
      sample.bootstrapLcpMs === null ? [] : [sample.bootstrapLcpMs],
    );
    const report = {
      capturedAt: new Date().toISOString(),
      baseUrl,
      route: "/#/dashboard",
      profile: { viewport: coldViewport, deviceScaleFactor: 1.75, cpuThrottleRate: 4 },
      sampleCount: samples.length,
      fcp: fcpSamples.length > 0 ? summarizePerformance(fcpSamples) : null,
      lcp: lcpSamples.length > 0 ? summarizePerformance(lcpSamples) : null,
      bootstrapLcp:
        bootstrapLcpSamples.length > 0 ? summarizePerformance(bootstrapLcpSamples) : null,
      samples,
    };
    await attachPerformanceReport(testInfo, "dashboard-bootstrap-shell.json", report);

    expect(samples).toHaveLength(3);
    for (const sample of samples) {
      expect(
        sample.shellVisibleAtMs,
        `sample ${sample.sample} should paint the bootstrap shell`,
      ).not.toBeNull();
      expect(
        sample.shellRemovedAtMs,
        `sample ${sample.sample} should remove the bootstrap shell`,
      ).not.toBeNull();
      expect(sample.shellVisibleAtMs).toBeLessThan(sample.liveClockVisibleAtMs);
      expect(sample.reactRootChildrenAtShellPaint).toBe(0);
      expect(sample.shellRemovedAtMs).toBeGreaterThanOrEqual(sample.shellVisibleAtMs ?? 0);
      expect(sample.lcpMs, `sample ${sample.sample} should report LCP`).not.toBeNull();
      expect(sample.bootstrapLcpMs).not.toBeNull();
    }
  });

  test("Dashboard critical shell stays styled until the full stylesheet is ready", async ({
    browser,
    request,
  }, testInfo) => {
    const indexResponse = await request.get(baseUrl);
    test.skip(
      !(await indexResponse.text()).includes('rel="stylesheet"'),
      "Critical stylesheet handoff is verified against the production build.",
    );

    for (const theme of ["light", "dark"] as const) {
      const context = await browser.newContext({
        viewport: { width: 412, height: 823 },
        serviceWorkers: "block",
      });
      let releaseCss: (() => void) | undefined;
      try {
        const page = await context.newPage();
        await page.addInitScript((storedTheme) => {
          localStorage.setItem("app-theme", storedTheme);
        }, theme);
        await loginFast(page, request, "admin");

        const cssGate = new Promise<void>((resolve) => {
          releaseCss = resolve;
        });
        await page.route("**/assets/index-*.css", async (route) => {
          await cssGate;
          await route.continue();
        });
        await page.goto(`${baseUrl}/#/dashboard`, { waitUntil: "commit" });

        const shell = page.locator("#dashboard-bootstrap-shell");
        await expect(shell).toBeVisible({ timeout: 15_000 });
        const criticalStyle = await page.evaluate(() => {
          const shellElement = document.querySelector<HTMLElement>("#dashboard-bootstrap-shell");
          const card = shellElement?.querySelector<HTMLElement>("section");
          const rect = card?.getBoundingClientRect();
          const stylesheet = document.querySelector<HTMLLinkElement>(
            'link[rel="stylesheet"][href*="/assets/index-"]',
          );
          return {
            dark: document.documentElement.classList.contains("dark"),
            media: stylesheet?.media ?? null,
            background: shellElement ? getComputedStyle(shellElement).backgroundColor : null,
            color: shellElement ? getComputedStyle(shellElement).color : null,
            cardBackground: card ? getComputedStyle(card).backgroundColor : null,
            cardWidth: rect?.width ?? 0,
            cardRight: rect?.right ?? 0,
          };
        });

        expect(criticalStyle.media).toBe("print");
        expect(criticalStyle.dark).toBe(theme === "dark");
        expect(criticalStyle.background).toBe(
          theme === "dark" ? "rgb(2, 6, 23)" : "rgb(240, 242, 245)",
        );
        expect(criticalStyle.color).toBe(
          theme === "dark" ? "rgb(248, 250, 252)" : "rgb(15, 23, 42)",
        );
        expect(criticalStyle.cardBackground).toBe(
          theme === "dark" ? "rgb(15, 23, 42)" : "rgb(253, 251, 247)",
        );
        expect(criticalStyle.cardWidth).toBeGreaterThan(0);
        expect(criticalStyle.cardRight).toBeLessThanOrEqual(412);
        await testInfo.attach(`dashboard-critical-${theme}.png`, {
          body: await page.screenshot(),
          contentType: "image/png",
        });

        releaseCss();
        await expect(page.locator('#root [data-testid="server-clock"]')).toBeVisible({
          timeout: 30_000,
        });
        await expect(shell).toHaveCount(0);
        await expect
          .poll(() =>
            page
              .locator('link[rel="stylesheet"][href*="/assets/index-"]')
              .evaluate((link) => (link as HTMLLinkElement).media),
          )
          .toBe("all");
      } finally {
        releaseCss?.();
        await context.close();
      }
    }
  });

  test("non-Dashboard content stays hidden until the full stylesheet is applied", async ({
    browser,
    request,
  }, testInfo) => {
    const indexResponse = await request.get(baseUrl);
    test.skip(
      !(await indexResponse.text()).includes('rel="stylesheet"'),
      "Stylesheet handoff is verified against the production build.",
    );

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      serviceWorkers: "block",
    });
    let releaseCss: (() => void) | undefined;
    try {
      const page = await context.newPage();
      await page.addInitScript(() => {
        localStorage.setItem("app-theme", "dark");
      });
      await loginFast(page, request, "admin");
      const cssGate = new Promise<void>((resolve) => {
        releaseCss = resolve;
      });
      await page.route("**/assets/index-*.css", async (route) => {
        await cssGate;
        await route.continue();
      });
      await page.goto(`${baseUrl}/#/time-control`, { waitUntil: "commit" });

      const stylesheet = page.locator('link[rel="stylesheet"][href*="/assets/index-"]');
      await expect(stylesheet).toHaveAttribute("media", "all");
      await page.waitForTimeout(150);
      const beforeStyles = await page.evaluate(() => ({
        rootVisibility: getComputedStyle(document.getElementById("root")!).visibility,
        bodyMargin: getComputedStyle(document.body).margin,
        bodyBackground: getComputedStyle(document.body).backgroundColor,
      }));
      expect(beforeStyles).toEqual({
        rootVisibility: "hidden",
        bodyMargin: "0px",
        bodyBackground: "rgb(2, 6, 23)",
      });
      await expect(page.getByTestId("main-content")).not.toBeVisible();
      await testInfo.attach("time-control-before-global-css.png", {
        body: await page.screenshot(),
        contentType: "image/png",
      });

      releaseCss();
      await expect(page.getByTestId("main-content")).toBeVisible({ timeout: 30_000 });
      await expect
        .poll(() => page.locator("#root").evaluate((root) => getComputedStyle(root).visibility))
        .toBe("visible");
      expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(
        true,
      );
    } finally {
      releaseCss?.();
      await context.close();
    }
  });

  test("Dashboard bootstrap timeout reveals the app if stylesheet loading stalls", async ({
    browser,
    request,
  }) => {
    const indexResponse = await request.get(baseUrl);
    test.skip(
      !(await indexResponse.text()).includes('rel="stylesheet"'),
      "Stylesheet handoff is verified against the production build.",
    );

    const context = await browser.newContext({
      viewport: { width: 412, height: 823 },
      serviceWorkers: "block",
    });
    let releaseCss: (() => void) | undefined;
    try {
      const page = await context.newPage();
      await page.addInitScript(() => {
        localStorage.setItem("app-theme", "dark");
      });
      await loginFast(page, request, "admin");
      await page.clock.install();
      const cssGate = new Promise<void>((resolve) => {
        releaseCss = resolve;
      });
      await page.route("**/assets/index-*.css", async (route) => {
        await cssGate;
        await route.continue();
      });
      await page.goto(`${baseUrl}/#/dashboard`, { waitUntil: "commit" });

      await expect(page.locator("#dashboard-bootstrap-shell")).toBeVisible();
      await page.clock.fastForward(8_001);
      await expect(page.locator("#dashboard-bootstrap-shell")).toHaveCount(0);
      await expect(page.locator("#root")).toHaveCSS("visibility", "visible");
    } finally {
      releaseCss?.();
      await context.close();
    }
  });

  test("Dashboard bootstrap stays absent without a Dashboard session or route", async ({
    browser,
    request,
  }) => {
    const unauthenticatedContext = await browser.newContext({ viewport });
    try {
      const page = await unauthenticatedContext.newPage();
      await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
      await expect(page.locator("#dashboard-bootstrap-shell")).toHaveCount(0);
      await expect(page.locator("#username")).toBeVisible({ timeout: 30_000 });
    } finally {
      await unauthenticatedContext.close();
    }

    const authenticatedContext = await browser.newContext({ viewport });
    try {
      const page = await authenticatedContext.newPage();
      await loginFast(page, request, "admin");
      await page.goto(`${baseUrl}/#/time-control`, { waitUntil: "domcontentloaded" });
      await expect(page.locator("#dashboard-bootstrap-shell")).toHaveCount(0);
      await expect(page.getByTestId("main-content")).toBeVisible({ timeout: 30_000 });
      await expect
        .poll(() =>
          page
            .locator('link[rel="stylesheet"][href*="/assets/index-"]')
            .evaluate((link) => (link as HTMLLinkElement).media),
        )
        .toBe("all");
    } finally {
      await authenticatedContext.close();
    }

    const restrictedContext = await browser.newContext({ viewport });
    try {
      const page = await restrictedContext.newPage();
      await loginFast(page, request, "worker");
      await page.goto(`${baseUrl}/#/dashboard`, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/#\/worker-portal/, { timeout: 30_000 });
      await expect(page.locator("#dashboard-bootstrap-shell")).toHaveCount(0);
    } finally {
      await restrictedContext.close();
    }
  });

  test("Dashboard bootstrap clears after query and route changes during cold boot", async ({
    browser,
    request,
  }) => {
    const context = await browser.newContext({ viewport });
    try {
      const page = await context.newPage();
      await loginFast(page, request, "admin");
      await page.route("**/assets/index-*.js", (route) =>
        route.fulfill({ status: 200, contentType: "text/javascript", body: "" }),
      );
      await page.goto(`${baseUrl}/#/dashboard`, { waitUntil: "domcontentloaded" });
      const shell = page.getByRole("heading", { name: "Dashboard Operativo" });
      await expect(shell).toBeVisible();

      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            window.addEventListener("hashchange", () => resolve(), { once: true });
            window.location.hash = "#/dashboard?boot=1";
          }),
      );
      await expect(shell).toBeVisible();

      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            window.addEventListener("hashchange", () => resolve(), { once: true });
            window.location.hash = "#/time-control";
          }),
      );
      await expect(page.locator("#dashboard-bootstrap-shell")).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test("Dashboard defers route, modal, and action-only timezone chunks", async ({
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
    const eagerTimezoneChunks = scriptRequests.filter((url) =>
      /\/assets\/(date-utils|dateUtils|formatters)-[^/?]+\.js(?:[?#]|$)/.test(url),
    );
    const eagerAutoStartSchedulingChunks = scriptRequests.filter((url) =>
      /\/assets\/(useScheduling|useShiftManager|useAssignedShiftsQuery|useShiftPatternsQuery|useHolidaysQuery|useLeavesQuery|schedulingService|holidayService)-[^/?]+\.js(?:[?#]|$)/.test(
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
      eagerTimezoneChunks,
      eagerAutoStartSchedulingChunks,
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
    expect(
      eagerTimezoneChunks,
      "Dashboard should load timezone helpers only when an action needs them",
    ).toEqual([]);
    expect(
      eagerAutoStartSchedulingChunks,
      "Dashboard should only load auto-start scheduling code for an eligible employee",
    ).toEqual([]);
  });

  test("Time Control excludes the timestamp editor from its cold route", async ({
    page,
  }, testInfo) => {
    const editModalRequests: string[] = [];
    page.on("request", (request) => {
      if (
        request.resourceType() === "script" &&
        /\/assets\/EditTimestampModal\.container-[^/?]+\.js(?:[?#]|$)/.test(request.url())
      ) {
        editModalRequests.push(request.url());
      }
    });

    await page.goto(`${baseUrl}/#/time-control`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Control de Asistencia" })).toBeVisible({
      timeout: 30_000,
    });
    await page.waitForLoadState("networkidle");

    const coldScriptResources = await page.evaluate(() => {
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
      };
    });

    const coldEditModalRequests = [...editModalRequests];
    expect(
      coldEditModalRequests,
      "The timestamp editor chunk must stay out of the cold Time Control route",
    ).toEqual([]);
    await attachPerformanceReport(testInfo, "time-control-deferred-editor.json", {
      capturedAt: new Date().toISOString(),
      baseUrl,
      route: "/#/time-control",
      coldScriptResources,
      coldEditModalRequests,
    });
  });

  test("Time Control initial sync records phase timings and remains blocking", async ({
    browser,
    request,
  }, testInfo) => {
    test.setTimeout(180_000);
    const mobileViewport = { width: 412, height: 823 };
    const samples: Array<Record<string, unknown>> = [];
    const fcpSamples: number[] = [];
    const lcpSamples: number[] = [];

    for (let sample = 1; sample <= 3; sample += 1) {
      const context = await browser.newContext({
        viewport: mobileViewport,
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
        timezoneId: "America/Santiago",
      });
      try {
        const page = await context.newPage();
        await loginFast(page, request, "admin");
        await page.addInitScript(() => {
          type SyncPhaseTiming = {
            phase: "validation" | "cache-check" | "sync-step";
            name: string;
            durationMs: number;
            outcome: "success" | "failure";
          };
          type OverlayPaintAudit = {
            initialLastSyncTime: string | null;
            timeOriginEpochMs: number;
            fcpEntries: number[];
            lcpEntries: Array<{
              startTimeMs: number;
              size: number;
              tag: string | null;
              className: string | null;
            }>;
            overlayVisibleAtMs: number | null;
            overlayHiddenAtMs: number | null;
            overlayVisibleAtEpochMs: number | null;
            overlayHiddenAtEpochMs: number | null;
            overlayCoverage: {
              coversViewport: boolean;
              hitTestBelongsToOverlay: boolean;
            } | null;
            loadingIndicatorCount: number | null;
            progressVisible: boolean;
            syncStepChanges: Array<{
              atEpochMs: number;
              step: string;
              progressPercent: number | null;
            }>;
            syncPhaseTimings: SyncPhaseTiming[];
            rootAnimationName: string | null;
            rootAnimationDuration: string | null;
            statusAnimationName: string | null;
            activeAnimations: Array<{
              tag: string;
              className: string;
              animationName: string;
              duration: string;
            }>;
          };
          const audit: OverlayPaintAudit = {
            initialLastSyncTime: localStorage.getItem("lastSyncTime"),
            timeOriginEpochMs: performance.timeOrigin,
            fcpEntries: [],
            lcpEntries: [],
            overlayVisibleAtMs: null,
            overlayHiddenAtMs: null,
            overlayVisibleAtEpochMs: null,
            overlayHiddenAtEpochMs: null,
            overlayCoverage: null,
            loadingIndicatorCount: null,
            progressVisible: false,
            syncStepChanges: [],
            syncPhaseTimings: [],
            rootAnimationName: null,
            rootAnimationDuration: null,
            statusAnimationName: null,
            activeAnimations: [],
          };
          (
            window as Window & { __syncOverlayPaintAudit?: OverlayPaintAudit }
          ).__syncOverlayPaintAudit = audit;
          (
            window as Window & { __PORTAL_SYNC_PERF_DIAGNOSTICS__?: boolean }
          ).__PORTAL_SYNC_PERF_DIAGNOSTICS__ = true;
          window.addEventListener("portal:sync-phase", (event) => {
            audit.syncPhaseTimings.push((event as CustomEvent<SyncPhaseTiming>).detail);
          });

          new PerformanceObserver((list) => {
            audit.fcpEntries.push(
              ...list
                .getEntries()
                .filter((entry) => entry.name === "first-contentful-paint")
                .map((entry) => entry.startTime),
            );
          }).observe({ type: "paint", buffered: true });
          new PerformanceObserver((list) => {
            audit.lcpEntries.push(
              ...list.getEntries().map((entry) => {
                const candidate = entry as PerformanceEntry & {
                  size: number;
                  element: Element | null;
                };
                const elementClassName = candidate.element?.className;
                return {
                  startTimeMs: candidate.startTime,
                  size: candidate.size,
                  tag: candidate.element?.tagName ?? null,
                  className:
                    typeof elementClassName === "string"
                      ? elementClassName
                      : (candidate.element?.getAttribute("class") ?? null),
                };
              }),
            );
          }).observe({ type: "largest-contentful-paint", buffered: true });

          let wasVisible = false;
          const observeOverlay = () => {
            const status = Array.from(document.querySelectorAll("p")).find(
              (element) =>
                element.textContent?.trim() ===
                "Establishing technical handshake • Validating integrity...",
            );
            const style = status ? getComputedStyle(status) : null;
            const isVisible = Boolean(
              status &&
              style?.display !== "none" &&
              style?.visibility !== "hidden" &&
              status.getClientRects().length > 0,
            );
            let root: HTMLElement | null = status ? (status as HTMLElement) : null;
            while (root && getComputedStyle(root).position !== "fixed") {
              root = root.parentElement;
            }
            if (root) {
              const spans = Array.from(root.querySelectorAll("span"));
              const step = spans
                .map((element) => element.textContent?.trim() ?? "")
                .find((text) =>
                  /^(Autenticando acceso|Preparando entorno seguro|Sincronizando |Completado)/.test(
                    text,
                  ),
                );
              const progressText = spans
                .map((element) => element.textContent?.trim() ?? "")
                .find((text) => /^\d+%$/.test(text));
              if (step) {
                const progressPercent = progressText ? Number.parseInt(progressText, 10) : null;
                const previous = audit.syncStepChanges.at(-1);
                if (previous?.step !== step || previous.progressPercent !== progressPercent) {
                  audit.syncStepChanges.push({
                    atEpochMs: performance.timeOrigin + performance.now(),
                    step,
                    progressPercent,
                  });
                }
              }
            }
            if (isVisible && !wasVisible && status) {
              audit.overlayVisibleAtMs = performance.now();
              audit.overlayVisibleAtEpochMs = performance.timeOrigin + performance.now();
              if (root) {
                const rect = root.getBoundingClientRect();
                const centralTarget = document.elementFromPoint(
                  window.innerWidth / 2,
                  window.innerHeight / 2,
                );
                audit.overlayCoverage = {
                  coversViewport:
                    rect.left <= 0 &&
                    rect.top <= 0 &&
                    rect.right >= window.innerWidth &&
                    rect.bottom >= window.innerHeight,
                  hitTestBelongsToOverlay: Boolean(centralTarget && root.contains(centralTarget)),
                };
                audit.loadingIndicatorCount = root.querySelectorAll(
                  '[role="status"][aria-label="Cargando"]',
                ).length;
                audit.progressVisible = Array.from(root.querySelectorAll("span")).some((element) =>
                  /^\d+%$/.test(element.textContent?.trim() ?? ""),
                );
                const rootStyle = getComputedStyle(root);
                audit.rootAnimationName = rootStyle.animationName;
                audit.rootAnimationDuration = rootStyle.animationDuration;
                audit.statusAnimationName = getComputedStyle(status).animationName;
                audit.activeAnimations = Array.from(root.querySelectorAll("*")).flatMap(
                  (element) => {
                    const animatedStyle = getComputedStyle(element);
                    return animatedStyle.animationName
                      .split(",")
                      .map((animationName) => animationName.trim())
                      .filter((animationName) => animationName && animationName !== "none")
                      .map((animationName) => ({
                        tag: element.tagName,
                        className:
                          typeof element.className === "string"
                            ? element.className
                            : (element.getAttribute("class") ?? ""),
                        animationName,
                        duration: animatedStyle.animationDuration,
                      }));
                  },
                );
              }
              wasVisible = true;
            } else if (!isVisible && wasVisible && audit.overlayHiddenAtMs === null) {
              audit.overlayHiddenAtMs = performance.now();
              audit.overlayHiddenAtEpochMs = performance.timeOrigin + performance.now();
            }
          };
          new MutationObserver(observeOverlay).observe(document, {
            attributes: true,
            attributeFilter: ["class", "hidden", "style"],
            childList: true,
            subtree: true,
          });
          observeOverlay();
        });

        const cdp = await context.newCDPSession(page);
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
        const navigationStartedAtEpochMs = Date.now();
        const apiRequestTimings = new Map<
          Request,
          {
            method: string;
            path: string;
            startedAtMs: number;
            responseAtMs: number | null;
            finishedAtMs: number | null;
            statusCode: number | null;
            responseBodyBytes: number | null;
            responseHasClosedHandover: boolean | null;
            failure: string | null;
            queryDimensions: {
              pageSize: string | null;
              hasEmployeeFilter: boolean;
              hasDateRange: boolean;
            activeEmployeeFilter: boolean | null;
            } | null;
          }
        >();
        const responseBodyReads: Promise<void>[] = [];
        const requestOffset = () => Number((Date.now() - navigationStartedAtEpochMs).toFixed(2));
        page.on("request", (request) => {
          const url = new URL(request.url());
          if (!url.pathname.startsWith("/api/")) return;
          apiRequestTimings.set(request, {
            method: request.method(),
            path: url.pathname,
            startedAtMs: requestOffset(),
            responseAtMs: null,
            finishedAtMs: null,
            statusCode: null,
            responseBodyBytes: null,
            responseHasClosedHandover: null,
            failure: null,
            queryDimensions:
              url.pathname === "/api/records"
                ? {
                    pageSize: url.searchParams.get("pageSize"),
                    hasEmployeeFilter: url.searchParams.has("employeeId"),
                    hasDateRange: url.searchParams.has("desde") && url.searchParams.has("hasta"),
                    activeEmployeeFilter: null,
                  }
                : url.pathname === "/api/employees"
                  ? {
                      pageSize: null,
                      hasEmployeeFilter: false,
                      hasDateRange: false,
                      activeEmployeeFilter: url.searchParams.get("status") === "Activo",
                    }
                  : null,
          });
        });
        page.on("response", (response) => {
          const timing = apiRequestTimings.get(response.request());
          if (!timing) return;
          timing.responseAtMs = requestOffset();
          timing.statusCode = response.status();
          if (
            timing.path === "/api/health" ||
            timing.path === "/api/health/ready" ||
            timing.path === "/api/employees" ||
            timing.path === "/api/users" ||
            timing.path === "/api/shift-reports"
          ) {
            responseBodyReads.push(
              response.body().then(
                (body) => {
                  timing.responseBodyBytes = body.byteLength;
                  if (timing.path === "/api/shift-reports") {
                    try {
                      const payload = JSON.parse(new TextDecoder().decode(body)) as unknown;
                      const reports = Array.isArray(payload)
                        ? payload
                        : payload &&
                            typeof payload === "object" &&
                            "data" in payload &&
                            Array.isArray(payload.data)
                          ? payload.data
                          : [];
                      timing.responseHasClosedHandover = reports.some((report: unknown) => {
                        if (!report || typeof report !== "object") return false;
                        return (
                          "status" in report &&
                          report.status === "closed" &&
                          "endTime" in report &&
                          Boolean(report.endTime)
                        );
                      });
                    } catch {
                      timing.responseHasClosedHandover = null;
                    }
                  }
                },
                () => undefined,
              ),
            );
          }
        });
        page.on("requestfinished", (request) => {
          const timing = apiRequestTimings.get(request);
          if (timing) timing.finishedAtMs = requestOffset();
        });
        page.on("requestfailed", (request) => {
          const timing = apiRequestTimings.get(request);
          if (!timing) return;
          timing.finishedAtMs = requestOffset();
          timing.failure = request.failure()?.errorText ?? "request failed";
        });
        await page.goto(`${baseUrl}/#/time-control`, { waitUntil: "domcontentloaded" });
        const syncOverlay = page.getByText(
          "Establishing technical handshake • Validating integrity...",
          { exact: true },
        );
        await expect(page.getByRole("heading", { name: "Control de Asistencia" })).toBeVisible({
          timeout: 30_000,
        });
        await expect(syncOverlay).toBeHidden({ timeout: 30_000 });
        const metrics = await page.evaluate(() => {
          const audit = (
            window as Window & {
              __syncOverlayPaintAudit?: {
                initialLastSyncTime: string | null;
                timeOriginEpochMs: number;
                fcpEntries: number[];
                lcpEntries: Array<{
                  startTimeMs: number;
                  size: number;
                  tag: string | null;
                  className: string | null;
                }>;
                overlayVisibleAtMs: number | null;
                overlayHiddenAtMs: number | null;
                overlayVisibleAtEpochMs: number | null;
                overlayHiddenAtEpochMs: number | null;
                overlayCoverage: {
                  coversViewport: boolean;
                  hitTestBelongsToOverlay: boolean;
                } | null;
                loadingIndicatorCount: number | null;
                progressVisible: boolean;
                syncStepChanges: Array<{
                  atEpochMs: number;
                  step: string;
                  progressPercent: number | null;
                }>;
                syncPhaseTimings: Array<{
                  phase: "validation" | "cache-check" | "sync-step";
                  name: string;
                  durationMs: number;
                  outcome: "success" | "failure";
                }>;
                rootAnimationName: string | null;
                rootAnimationDuration: string | null;
                statusAnimationName: string | null;
                activeAnimations: Array<{
                  tag: string;
                  className: string;
                  animationName: string;
                  duration: string;
                }>;
              };
            }
          ).__syncOverlayPaintAudit;
          const lastSyncTime = localStorage.getItem("lastSyncTime");
          if (!audit || !lastSyncTime) throw new Error("Initial sync paint audit is incomplete");
          return {
            initialLastSyncTime: audit.initialLastSyncTime,
            timeOriginEpochMs: audit.timeOriginEpochMs,
            lastSyncTimePresent: Boolean(lastSyncTime),
            fcpMs: audit.fcpEntries[0] ?? null,
            lcpEntries: audit.lcpEntries,
            overlayVisibleAtMs: audit.overlayVisibleAtMs,
            overlayHiddenAtMs: audit.overlayHiddenAtMs,
            overlayVisibleAtEpochMs: audit.overlayVisibleAtEpochMs,
            overlayHiddenAtEpochMs: audit.overlayHiddenAtEpochMs,
            overlayCoverage: audit.overlayCoverage,
            loadingIndicatorCount: audit.loadingIndicatorCount,
            progressVisible: audit.progressVisible,
            syncStepChanges: audit.syncStepChanges,
            syncPhaseTimings: audit.syncPhaseTimings,
            overlayVisibleDurationMs:
              audit.overlayVisibleAtMs !== null && audit.overlayHiddenAtMs !== null
                ? Number((audit.overlayHiddenAtMs - audit.overlayVisibleAtMs).toFixed(2))
                : null,
            rootAnimationName: audit.rootAnimationName,
            rootAnimationDuration: audit.rootAnimationDuration,
            statusAnimationName: audit.statusAnimationName,
            activeAnimations: audit.activeAnimations,
            syncReadyAtMs: performance.now(),
          };
        });
        const activeEmployeeProbe = captureActiveEmployeeFilterProbe
          ? await page.evaluate(async () => {
              const token = sessionStorage.getItem("authToken");
              if (!token) return { status: null, responseBodyBytes: null };
              const response = await fetch("/api/employees?status=Activo", {
                headers: { Authorization: `Bearer ${token}` },
              });
              return {
                status: response.status,
                responseBodyBytes: (await response.arrayBuffer()).byteLength,
              };
            })
          : null;
        await Promise.all(responseBodyReads);
        expect(metrics.initialLastSyncTime).toBeNull();
        expect(metrics.lastSyncTimePresent).toBe(true);
        expect(metrics.overlayVisibleAtMs).not.toBeNull();
        expect(metrics.overlayHiddenAtMs).not.toBeNull();
        if (!metrics.overlayCoverage)
          throw new Error("Initial sync overlay coverage was not captured");
        const overlayCoverage = metrics.overlayCoverage;
        expect(overlayCoverage.coversViewport).toBe(true);
        expect(overlayCoverage.hitTestBelongsToOverlay).toBe(true);
        expect(metrics.loadingIndicatorCount).toBe(2);
        expect(metrics.progressVisible).toBe(true);
        if (metrics.fcpMs === null) throw new Error("First Contentful Paint was not recorded");
        expect(metrics.lcpEntries.length).toBeGreaterThan(0);
        expect(metrics.rootAnimationName).toBeTruthy();
        expect(metrics.rootAnimationDuration).toBeTruthy();
        expect(metrics.statusAnimationName).toBeTruthy();
        expect(
          metrics.syncStepChanges.some((change) => change.step.startsWith("Sincronizando ")),
        ).toBe(true);
        expect(metrics.syncPhaseTimings.map(({ phase, name }) => [phase, name])).toEqual([
          ["validation", "validateInstanceId"],
          ["sync-step", "Usuarios"],
          ["sync-step", "Empleados"],
          ["sync-step", "Configuraciones"],
          ["sync-step", "Horarios"],
          ["sync-step", "Medidores"],
        ]);
        expect(
          metrics.syncPhaseTimings.every(
            ({ durationMs, outcome }) =>
              Number.isFinite(durationMs) && durationMs >= 0 && outcome === "success",
          ),
        ).toBe(true);
        expect(apiRequestTimings.size).toBeGreaterThan(0);
        const readinessRequests = Array.from(apiRequestTimings.values()).filter(
          (timing) => timing.path === "/api/health/ready",
        );
        const detailedHealthRequests = Array.from(apiRequestTimings.values()).filter(
          (timing) => timing.path === "/api/health",
        );
        expect(readinessRequests).toHaveLength(1);
        expect(readinessRequests[0]?.statusCode).toBe(200);
        expect(readinessRequests[0]?.responseBodyBytes).not.toBeNull();
        expect(readinessRequests[0]?.responseBodyBytes ?? Infinity).toBeLessThan(512);
        expect(detailedHealthRequests).toHaveLength(0);
        const employeeRequests = Array.from(apiRequestTimings.values()).filter(
          (timing) => timing.path === "/api/employees",
        );
        expect(employeeRequests.length).toBeGreaterThan(0);
        expect(
          employeeRequests.every((timing) => timing.responseBodyBytes !== null),
          "the performance report should retain only the employee response byte count",
        ).toBe(true);
        if (activeEmployeeProbe) {
          expect(activeEmployeeProbe.status).toBe(200);
          expect(activeEmployeeProbe.responseBodyBytes).not.toBeNull();
          const activeEmployeeRequests = employeeRequests.filter(
            (timing) => timing.queryDimensions?.activeEmployeeFilter === true,
          );
          expect(activeEmployeeRequests).toHaveLength(1);
          expect(activeEmployeeRequests[0]?.responseBodyBytes).toBe(
            activeEmployeeProbe.responseBodyBytes,
          );
        }
        const userDirectoryRequests = Array.from(apiRequestTimings.values()).filter(
          (timing) => timing.path === "/api/users",
        );
        expect(
          userDirectoryRequests.every((timing) => timing.responseBodyBytes !== null),
          "the performance report should retain only the user response byte count",
        ).toBe(true);
        const shiftReportRequests = Array.from(apiRequestTimings.values()).filter(
          (timing) => timing.path === "/api/shift-reports",
        );
        expect(
          shiftReportRequests.every((timing) => timing.responseHasClosedHandover !== null),
          "the performance report should record only whether a closed handover exists",
        ).toBe(true);
        const hasClosedHandover = shiftReportRequests.some(
          (timing) => timing.responseHasClosedHandover === true,
        );
        if (!hasClosedHandover) {
          expect(
            userDirectoryRequests,
            "the Time Control startup must not fetch the user directory without a closed handover",
          ).toHaveLength(0);
        }
        expect(userDirectoryRequests.length).toBeLessThanOrEqual(1);
        expect(userDirectoryRequests.every((timing) => timing.statusCode === 200)).toBe(true);
        expect(apiRequestTimings.size).toBeLessThanOrEqual(20);
        const recordRequestTimings = Array.from(apiRequestTimings.values()).filter(
          (timing) => timing.path === "/api/records",
        );
        expect(recordRequestTimings).toHaveLength(2);
        expect(
          recordRequestTimings.some(
            (timing) =>
              timing.queryDimensions?.pageSize === "5" && !timing.queryDimensions.hasEmployeeFilter,
          ),
        ).toBe(false);
        expect(
          recordRequestTimings.some(
            (timing) =>
              timing.queryDimensions?.pageSize === "30" && timing.queryDimensions.hasDateRange,
          ),
        ).toBe(true);
        expect(
          recordRequestTimings.some((timing) => timing.queryDimensions?.pageSize === "50"),
        ).toBe(true);
        expect(
          metrics.activeAnimations.some((animation) => animation.animationName === "spin"),
          "The progress spinner must retain its rotation while the sync overlay is visible",
        ).toBe(true);
        const finalLcpCandidate = metrics.lcpEntries.at(-1);
        if (!finalLcpCandidate)
          throw new Error("Largest Contentful Paint candidate was not recorded");
        fcpSamples.push(metrics.fcpMs);
        lcpSamples.push(finalLcpCandidate.startTimeMs);

        samples.push({
          sample,
          overlayCoverage,
          initialLastSyncTime: metrics.initialLastSyncTime,
          lastSyncTimePresent: metrics.lastSyncTimePresent,
          fcpMs: metrics.fcpMs,
          lcpEntries: metrics.lcpEntries,
          overlayVisibleAtMs:
            metrics.overlayVisibleAtEpochMs === null
              ? null
              : Number((metrics.overlayVisibleAtEpochMs - navigationStartedAtEpochMs).toFixed(2)),
          overlayHiddenAtMs:
            metrics.overlayHiddenAtEpochMs === null
              ? null
              : Number((metrics.overlayHiddenAtEpochMs - navigationStartedAtEpochMs).toFixed(2)),
          syncStepChanges: metrics.syncStepChanges.map(({ atEpochMs, ...change }) => ({
            atMs: Number((atEpochMs - navigationStartedAtEpochMs).toFixed(2)),
            ...change,
          })),
          syncPhaseTimings: metrics.syncPhaseTimings,
          overlayVisibleDurationMs: metrics.overlayVisibleDurationMs,
          rootAnimationName: metrics.rootAnimationName,
          rootAnimationDuration: metrics.rootAnimationDuration,
          statusAnimationName: metrics.statusAnimationName,
          activeAnimations: metrics.activeAnimations,
          syncReadyAtMs: metrics.syncReadyAtMs,
          activeEmployeeProbe,
          apiRequests: Array.from(apiRequestTimings.values()).map((timing) => ({
            ...timing,
            durationMs:
              timing.finishedAtMs === null
                ? null
                : Number((timing.finishedAtMs - timing.startedAtMs).toFixed(2)),
          })),
          finalLcpCandidate,
        });
        await cdp.detach();
      } finally {
        await context.close();
      }
    }

    await attachPerformanceReport(testInfo, "time-control-sync-phase-diagnostics.json", {
      capturedAt: new Date().toISOString(),
      baseUrl,
      route: "/#/time-control",
      viewport: mobileViewport,
      cpuThrottle: 4,
      sampleCount: samples.length,
      apiRequestPathPolicy:
        "pathname only; request/response bodies omitted; byte lengths recorded for health, employees and users; /api/employees records only whether status=Activo; optional active-filter payload diagnostic uses PERFORMANCE_ACTIVE_EMPLOYEE_FILTER_PROBE=1; /api/shift-reports records only closed-handover presence; /api/records captures pageSize and filter-presence booleans only",
      syncPhasePolicy:
        "opt-in CustomEvent records phase, name, duration and outcome only; user/session data omitted",
      timingOffsetBasis: "Date.now immediately before page.goto",
      readinessMetric:
        "Sync step and API request timeline, initial sync overlay LCP candidate and hit-test under a clean authenticated context",
      samples,
      fcpStats: summarizePerformance(fcpSamples),
      observedLcpStats: summarizePerformance(lcpSamples),
    });
  });

  test("Time Control shows its page shell while attendance records are pending", async ({
    page,
  }, testInfo) => {
    const mobileViewport = { width: 412, height: 823 };
    await page.setViewportSize(mobileViewport);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const recordsPattern = "**/api/records**";
    let recordsRequestPending = false;
    let releaseRecords: (() => void) | undefined;
    const recordsGate = new Promise<void>((resolve) => {
      releaseRecords = resolve;
    });
    await page.route(recordsPattern, async (route) => {
      recordsRequestPending = true;
      await recordsGate;
      await route.continue();
    });

    const navigationStartedAt = performance.now();
    try {
      await page.goto(`${baseUrl}/#/time-control`, { waitUntil: "domcontentloaded" });
      await expect.poll(() => recordsRequestPending, { timeout: 15_000 }).toBe(true);

      const recordsPendingAtMs = Number((performance.now() - navigationStartedAt).toFixed(2));
      const heading = page.getByRole("heading", { name: "Control de Asistencia" });
      const syncOverlay = page.getByText(
        "Establishing technical handshake • Validating integrity...",
        {
          exact: true,
        },
      );
      await expect(heading).toBeVisible({ timeout: 10_000 });
      const headingRenderedAtMs = Number((performance.now() - navigationStartedAt).toFixed(2));
      const syncOverlayWasVisible = await syncOverlay.isVisible();

      await expect(syncOverlay).toBeHidden({ timeout: 15_000 });
      const shellUnobscuredAtMs = Number((performance.now() - navigationStartedAt).toFixed(2));
      const headingIsUnobscured = await heading.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const topElement = document.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        );
        return topElement === element || element.contains(topElement);
      });

      expect(recordsRequestPending).toBe(true);
      expect(headingIsUnobscured).toBe(true);
      expect(await page.getByText("Optimizando registros de asistencia...").count()).toBe(0);
      await attachPerformanceReport(testInfo, "time-control-shell-before-records.json", {
        capturedAt: new Date().toISOString(),
        baseUrl,
        route: "/#/time-control",
        viewport: mobileViewport,
        recordsPendingAtMs,
        headingRenderedAtMs,
        syncOverlayWasVisible,
        shellUnobscuredAtMs,
        headingIsUnobscured,
        recordsWereStillPendingAtUnobscured: recordsRequestPending,
      });
    } finally {
      releaseRecords?.();
      await cdp.detach();
    }

    await page.waitForLoadState("networkidle");
    await page.unroute(recordsPattern);
  });

  test("Time Control SPA transition after initial sync", async ({ browser, request }, testInfo) => {
    test.setTimeout(180_000);
    const dashboardRoute = criticalRoutes.find((route) => route.id === "dashboard");
    const timeControlRoute = criticalRoutes.find((route) => route.id === "time-control");
    if (
      !dashboardRoute ||
      !timeControlRoute ||
      !dashboardRoute.currentPath ||
      !timeControlRoute.currentPath
    ) {
      throw new Error("Dashboard and Time Control routes must exist in the performance catalog");
    }

    const samples: Array<{
      sample: number;
      initialSync: {
        completedAtMs: number;
        overlayVisibleAtMs: number | null;
        overlayHiddenAtMs: number | null;
      };
      firstVisitAfterSync: {
        elapsedMs: number;
        sameDocument: boolean;
        finalHash: string;
        scriptRequests: string[];
      };
      repeatedVisitWithRouteChunkLoaded: {
        elapsedMs: number;
        sameDocument: boolean;
        finalHash: string;
        scriptRequests: string[];
      };
    }> = [];

    for (let sample = 1; sample <= 3; sample += 1) {
      const context = await browser.newContext({
        viewport,
        timezoneId: "America/Santiago",
      });
      try {
        const page = await context.newPage();
        await loginFast(page, request, "admin");
        await page.addInitScript(() => {
          type SyncAudit = {
            initialLastSyncTime: string | null;
            overlayVisibleAtMs: number | null;
            overlayHiddenAtMs: number | null;
          };
          const windowWithAudit = window as Window & {
            __timeControlSyncAudit?: SyncAudit;
          };
          const audit: SyncAudit = {
            initialLastSyncTime: localStorage.getItem("lastSyncTime"),
            overlayVisibleAtMs: null,
            overlayHiddenAtMs: null,
          };
          windowWithAudit.__timeControlSyncAudit = audit;
          let wasVisible = false;
          const observeOverlay = () => {
            const status = Array.from(document.querySelectorAll("p")).find(
              (element) =>
                element.textContent?.trim() ===
                "Establishing technical handshake • Validating integrity...",
            );
            const style = status ? getComputedStyle(status) : null;
            const isVisible = Boolean(
              status &&
              style?.display !== "none" &&
              style?.visibility !== "hidden" &&
              status.getClientRects().length > 0,
            );
            if (isVisible && !wasVisible) {
              audit.overlayVisibleAtMs = performance.now();
              wasVisible = true;
            } else if (!isVisible && wasVisible && audit.overlayHiddenAtMs === null) {
              audit.overlayHiddenAtMs = performance.now();
            }
          };
          new MutationObserver(observeOverlay).observe(document, {
            attributes: true,
            attributeFilter: ["class", "hidden", "style"],
            childList: true,
            subtree: true,
          });
          observeOverlay();
        });

        const scriptRequests: Array<{ phase: string; file: string }> = [];
        let scriptPhase = "initial-sync";
        page.on("request", (browserRequest) => {
          if (browserRequest.resourceType() !== "script") return;
          const file = new URL(browserRequest.url()).pathname.split("/").pop();
          if (file) scriptRequests.push({ phase: scriptPhase, file });
        });

        await page.goto(`${baseUrl}${dashboardRoute.path}`, { waitUntil: "domcontentloaded" });
        await expect(readyLocatorForRoute(page, dashboardRoute)).toBeVisible({ timeout: 30_000 });
        await expect(page.getByTestId("server-clock")).toBeVisible({ timeout: 30_000 });
        const syncOverlay = page.getByText(
          "Establishing technical handshake • Validating integrity...",
          { exact: true },
        );
        await expect(syncOverlay).toBeHidden({ timeout: 30_000 });

        const syncState = await page.evaluate(() => {
          const audit = (
            window as Window & {
              __timeControlSyncAudit?: {
                initialLastSyncTime: string | null;
                overlayVisibleAtMs: number | null;
                overlayHiddenAtMs: number | null;
              };
            }
          ).__timeControlSyncAudit;
          const lastSyncTime = localStorage.getItem("lastSyncTime");
          if (!audit || !lastSyncTime) throw new Error("Initial sync marker is missing");
          return {
            initialLastSyncTime: audit.initialLastSyncTime,
            lastSyncTime,
            overlayVisibleAtMs: audit.overlayVisibleAtMs,
            overlayHiddenAtMs: audit.overlayHiddenAtMs,
            completedAtMs: performance.now(),
          };
        });
        expect(syncState.initialLastSyncTime).toBeNull();
        expect(Number(syncState.lastSyncTime)).toBeGreaterThan(0);
        if (syncState.overlayVisibleAtMs !== null) {
          expect(syncState.overlayHiddenAtMs).not.toBeNull();
        }

        const cdp = await context.newCDPSession(page);
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
        const measureSpaTransition = async (
          targetHash: string,
          targetPath: string,
          targetHeading: string | null,
          targetTestId: string | null,
        ) => {
          const start = await page.evaluate((hash) => {
            const probe = {
              startedAtMs: performance.now(),
              timeOrigin: performance.timeOrigin,
              readyAtMs: null as number | null,
            };
            (window as Window & { __spaTransitionProbe?: typeof probe }).__spaTransitionProbe =
              probe;
            window.location.hash = hash;
            return { startedAtMs: probe.startedAtMs, timeOrigin: probe.timeOrigin };
          }, targetHash);

          await page.waitForFunction(
            ({ currentPath, heading, testId }) => {
              const shell = document.querySelector('[data-testid="app-shell"]');
              const mainContent = shell?.querySelector('[data-testid="main-content"]');
              const candidate = testId
                ? document.querySelector(`[data-testid="${testId}"]`)
                : Array.from(document.querySelectorAll("h1")).find(
                    (element) => element.textContent?.trim() === heading,
                  );
              const isVisible = (element: Element | null | undefined) => {
                if (!element) return false;
                const style = getComputedStyle(element);
                return (
                  element.isConnected &&
                  style.display !== "none" &&
                  style.visibility !== "hidden" &&
                  element.getClientRects().length > 0
                );
              };
              if (
                shell?.getAttribute("data-current-path") === currentPath &&
                isVisible(mainContent) &&
                isVisible(candidate)
              ) {
                const probe = (
                  window as Window & {
                    __spaTransitionProbe?: { readyAtMs: number | null };
                  }
                ).__spaTransitionProbe;
                if (probe && probe.readyAtMs === null) probe.readyAtMs = performance.now();
                return true;
              }
              return false;
            },
            { currentPath: targetPath, heading: targetHeading, testId: targetTestId },
            { polling: "raf", timeout: 30_000 },
          );

          const metrics = await page.evaluate((transitionStart) => {
            const probe = (
              window as Window & {
                __spaTransitionProbe?: {
                  startedAtMs: number;
                  timeOrigin: number;
                  readyAtMs: number | null;
                };
              }
            ).__spaTransitionProbe;
            if (!probe || probe.readyAtMs === null) {
              throw new Error("SPA route readiness timestamp was not recorded");
            }
            return {
              elapsedMs: Number((probe.readyAtMs - transitionStart.startedAtMs).toFixed(2)),
              sameDocument: performance.timeOrigin === transitionStart.timeOrigin,
              finalHash: window.location.hash,
            };
          }, start);
          return { ...metrics, scriptRequests: [] as string[] };
        };

        scriptPhase = "first-spa-visit-after-sync";
        const firstScriptRequestIndex = scriptRequests.length;
        const firstVisit = await measureSpaTransition(
          timeControlRoute.path.slice(timeControlRoute.path.indexOf("#")),
          timeControlRoute.currentPath,
          "Control de Asistencia",
          null,
        );
        firstVisit.scriptRequests = scriptRequests
          .slice(firstScriptRequestIndex)
          .map((entry) => entry.file);
        expect(firstVisit.sameDocument).toBe(true);
        expect(firstVisit.finalHash).toBe("#/time-control");

        await page.evaluate(() => {
          window.location.hash = "#/dashboard";
        });
        await expect(readyLocatorForRoute(page, dashboardRoute)).toBeVisible({ timeout: 30_000 });
        await expect(page.getByTestId("server-clock")).toBeVisible({ timeout: 30_000 });

        scriptPhase = "repeated-spa-visit-after-sync";
        const repeatedScriptRequestIndex = scriptRequests.length;
        const repeatedVisit = await measureSpaTransition(
          timeControlRoute.path.slice(timeControlRoute.path.indexOf("#")),
          timeControlRoute.currentPath,
          "Control de Asistencia",
          null,
        );
        repeatedVisit.scriptRequests = scriptRequests
          .slice(repeatedScriptRequestIndex)
          .map((entry) => entry.file);
        expect(repeatedVisit.sameDocument).toBe(true);
        expect(repeatedVisit.finalHash).toBe("#/time-control");
        expect(firstVisit.elapsedMs).toBeLessThan(15_000);
        expect(repeatedVisit.elapsedMs).toBeLessThan(15_000);

        samples.push({
          sample,
          initialSync: {
            completedAtMs: syncState.completedAtMs,
            overlayVisibleAtMs: syncState.overlayVisibleAtMs,
            overlayHiddenAtMs: syncState.overlayHiddenAtMs,
          },
          firstVisitAfterSync: firstVisit,
          repeatedVisitWithRouteChunkLoaded: repeatedVisit,
        });
        await cdp.detach();
      } finally {
        await context.close();
      }
    }

    const firstVisitStats = summarizePerformance(
      samples.map((sample) => sample.firstVisitAfterSync.elapsedMs),
    );
    const repeatedVisitStats = summarizePerformance(
      samples.map((sample) => sample.repeatedVisitWithRouteChunkLoaded.elapsedMs),
    );
    await attachPerformanceReport(testInfo, "time-control-spa-transition.json", {
      capturedAt: new Date().toISOString(),
      baseUrl,
      route: "/#/time-control",
      startRoute: "/#/dashboard",
      viewport,
      cpuThrottle: 4,
      readinessMetric:
        "browser performance.now from SPA hash change until Time Control main content and heading are visible",
      lcpApplicable: false,
      initialSync:
        "Each sample starts with a new browser context and requires lastSyncTime after the overlay is hidden.",
      samples,
      firstVisitStats,
      repeatedVisitStats,
    });
  });

  test("Time Control defers the virtualized table until it enters the mobile viewport", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 412, height: 823 });
    const tableChunkRequests: string[] = [];
    page.on("request", (request) => {
      if (
        request.resourceType() === "script" &&
        /\/assets\/(?:TimeRecordTableViewMobile|tables)-[^/?]+\.js(?:[?#]|$)/.test(request.url())
      ) {
        tableChunkRequests.push(new URL(request.url()).pathname.split("/").pop() ?? "");
      }
    });

    await page.goto(`${baseUrl}/#/time-control`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Control de Asistencia" })).toBeVisible({
      timeout: 30_000,
    });
    await page.waitForLoadState("networkidle");
    const coldTableChunkRequests = [...tableChunkRequests];

    await page.getByText("REGISTROS DE ASISTENCIA", { exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByPlaceholder("Buscar por nombre...")).toBeVisible({ timeout: 30_000 });
    await page.waitForLoadState("networkidle");

    const report = {
      capturedAt: new Date().toISOString(),
      baseUrl,
      route: "/#/time-control",
      profile: { viewport: { width: 412, height: 823 }, deviceScaleFactor: 1 },
      coldTableChunkRequests,
      postScrollTableChunkRequests: [...tableChunkRequests],
    };
    await attachPerformanceReport(testInfo, "time-control-deferred-table.json", report);

    expect(
      coldTableChunkRequests,
      "The mobile table and shared table chunks must stay out of the cold route",
    ).toEqual([]);
    expect(tableChunkRequests).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^TimeRecordTableViewMobile-/),
        expect.stringMatching(/^tables-/),
      ]),
    );
  });

  test("Dashboard startup avoids the kiosk list and repeated API reads", async ({
    page,
  }, testInfo) => {
    const apiPaths: string[] = [];
    const inFlight = new Set<Request>();
    const requestStartTimes = new Map<Request, number>();
    const responseStatuses = new Map<Request, number>();
    const apiRequestTimings: {
      path: string;
      startOffsetMs: number;
      durationMs: number;
      finishOffsetMs: number;
      status: number | null;
    }[] = [];
    let lastApiActivity = Date.now();
    const navigationStartedAt = performance.now();
    const trackRequest = (request: import("@playwright/test").Request) => {
      const url = new URL(request.url());
      if (!url.pathname.startsWith("/api/")) return;
      apiPaths.push(url.pathname);
      inFlight.add(request);
      requestStartTimes.set(request, performance.now());
      lastApiActivity = Date.now();
    };
    const recordResponseStatus = (response: import("@playwright/test").Response) => {
      const request = response.request();
      if (requestStartTimes.has(request)) responseStatuses.set(request, response.status());
    };
    const finishRequest = (request: Request) => {
      if (!inFlight.delete(request)) return;
      const startTime = requestStartTimes.get(request);
      if (startTime !== undefined) {
        const finishTime = performance.now();
        apiRequestTimings.push({
          path: new URL(request.url()).pathname,
          startOffsetMs: Number((startTime - navigationStartedAt).toFixed(2)),
          durationMs: Number((finishTime - startTime).toFixed(2)),
          finishOffsetMs: Number((finishTime - navigationStartedAt).toFixed(2)),
          status: responseStatuses.get(request) ?? null,
        });
        requestStartTimes.delete(request);
        responseStatuses.delete(request);
      }
      lastApiActivity = Date.now();
    };
    page.on("request", trackRequest);
    page.on("response", recordResponseStatus);
    page.on("requestfinished", finishRequest);
    page.on("requestfailed", finishRequest);

    await page.goto(`${baseUrl}/#/dashboard`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("main-content")).toBeVisible({ timeout: 30_000 });
    const mainContentVisibleOffsetMs = Number((performance.now() - navigationStartedAt).toFixed(2));
    await expect(page.getByTestId("server-clock")).toBeVisible({ timeout: 30_000 });
    const serverClockVisibleOffsetMs = Number((performance.now() - navigationStartedAt).toFixed(2));

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
    const autoStartSchedulingRequests = apiPaths.filter((path) =>
      autoStartSchedulingApiPaths.has(path),
    );
    const apiRequestsPendingWhenServerClockAppeared = apiRequestTimings
      .filter(
        ({ startOffsetMs, finishOffsetMs }) =>
          startOffsetMs <= serverClockVisibleOffsetMs &&
          finishOffsetMs > serverClockVisibleOffsetMs,
      )
      .map(({ path, finishOffsetMs }) => ({ path, finishOffsetMs }));
    const dashboardDataRequestsPendingWhenServerClockAppeared =
      apiRequestsPendingWhenServerClockAppeared.filter(({ path }) =>
        ["/api/kpis/overview", "/api/shift-reports"].includes(path),
      );
    const report = {
      capturedAt: new Date().toISOString(),
      baseUrl,
      route: "/#/dashboard",
      mainContentVisibleOffsetMs,
      serverClockVisibleOffsetMs,
      apiRequestsPendingWhenServerClockAppeared,
      dashboardDataRequestsPendingWhenServerClockAppeared,
      apiRequestCount: apiPaths.length,
      uniqueApiEndpointCount: requestCounts.size,
      duplicateEndpoints,
      autoStartSchedulingRequests,
      apiPaths,
      apiRequestTimings: [...apiRequestTimings].sort((a, b) => b.durationMs - a.durationMs),
    };
    await attachPerformanceReport(testInfo, "dashboard-startup-api-requests.json", report);

    expect(inFlight.size, "Dashboard API requests should settle after startup").toBe(0);
    expect(
      apiRequestTimings,
      "every API request should include a complete duration and status",
    ).toHaveLength(apiPaths.length);
    expect(
      apiRequestTimings.every(({ status }) => status === 200),
      "Dashboard startup API requests should all succeed",
    ).toBe(true);
    expect(apiPaths, "the public kiosk list belongs only to kiosk mode").not.toContain(
      "/api/employees/kiosk",
    );
    expect(apiPaths.length, "spec 042 recorded 21 Dashboard startup API requests").toBeLessThan(21);
    expect(apiPaths.length, "Specs 047 and 048 remove two non-critical startup requests").toBe(8);
    expect(
      duplicateEndpoints,
      "Dashboard startup should request each API endpoint at most once",
    ).toEqual([]);
    expect(
      autoStartSchedulingRequests,
      "Dashboard should not load auto-start scheduling data for an Administrator without an employee",
    ).toEqual([]);
    expect(
      apiPaths,
      "the Dashboard uses the fixed company policy file URL and should not fetch redundant metadata",
    ).not.toContain("/api/configs/public/company-policy");
    expect(
      apiPaths,
      "ambient reminders should defer notes until their prefetch window",
    ).not.toContain("/api/notes");
    expect(apiPaths.filter((path) => path === "/api/health").length).toBeLessThanOrEqual(1);
  });

  test("Quick Notes fetches notes only after the modal opens", async ({ page }, testInfo) => {
    let notesRequestStartedAt: number | null = null;
    let notesResponseStatus: number | null = null;
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/notes") {
        notesRequestStartedAt = performance.now();
      }
    });
    page.on("response", (response) => {
      if (new URL(response.url()).pathname === "/api/notes") {
        notesResponseStatus = response.status();
      }
    });

    await page.goto(`${baseUrl}/#/dashboard`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("main-content")).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1_200);
    expect(notesRequestStartedAt, "Dashboard startup should defer notes").toBeNull();

    const modalOpenedAt = performance.now();
    await page.getByRole("button", { name: "Notas" }).click();
    await expect.poll(() => notesResponseStatus, { timeout: 15_000 }).toBe(200);

    const report = {
      capturedAt: new Date().toISOString(),
      baseUrl,
      route: "/#/dashboard",
      apiPath: "/api/notes",
      requestedBeforeModalOpen:
        notesRequestStartedAt !== null && notesRequestStartedAt < modalOpenedAt,
      requestOffsetFromModalOpenMs:
        notesRequestStartedAt === null
          ? null
          : Number((notesRequestStartedAt - modalOpenedAt).toFixed(2)),
      responseStatus: notesResponseStatus,
    };
    await attachPerformanceReport(testInfo, "quick-notes-on-demand.json", report);
    expect(report.requestedBeforeModalOpen).toBe(false);
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
