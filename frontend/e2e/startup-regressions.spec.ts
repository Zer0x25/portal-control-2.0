import { performance } from "node:perf_hooks";
import { expect, test, type Request } from "@playwright/test";
import { loginFast } from "./helpers/auth-helper";
import { attachPerformanceReport, summarizePerformance } from "./helpers/performance-metrics";

const viewport = { width: 1440, height: 900 };
const baseUrl = process.env.E2E_BASE_URL || "http://127.0.0.1:5174";
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
type WorkerPortalBootstrapAuditState = {
  events: {
    type: "visible" | "removed" | "clock-visible";
    atMs: number;
    rootChildren: number;
  }[];
  paints: { name: string; startTime: number }[];
  lcpEntries: {
    startTime: number;
    elementTag: string | null;
    isBootstrapShell: boolean;
  }[];
};

test.describe.serial("Startup regressions", () => {
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

    for (let sample = 1; sample <= 1; sample++) {
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
            const shell = document.getElementById("app-bootstrap-shell");
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
                  isBootstrapShell: Boolean(lcpEntry.element?.closest("#app-bootstrap-shell")),
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

    expect(samples).toHaveLength(1);
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

  test("Worker Portal bootstrap shell paints before React and releases after the real clock", async ({
    browser,
    request,
  }, testInfo) => {
    const coldViewport = { width: 412, height: 823 };
    const samples: {
      sample: number;
      fcpMs: number | null;
      shellLcpMs: number | null;
      shellVisibleAtMs: number | null;
      rootChildrenAtShellPaint: number | null;
      clockVisibleAtMs: number | null;
      shellRemovedAtMs: number | null;
      lcpEntries: WorkerPortalBootstrapAuditState["lcpEntries"];
    }[] = [];

    for (let sample = 1; sample <= 1; sample++) {
      const context = await browser.newContext({
        viewport: coldViewport,
        deviceScaleFactor: 1.75,
        isMobile: true,
        hasTouch: true,
        timezoneId: "America/Santiago",
        serviceWorkers: "block",
      });
      try {
        const page = await context.newPage();
        await page.addInitScript(() => {
          const audit: WorkerPortalBootstrapAuditState = {
            events: [],
            paints: [],
            lcpEntries: [],
          };
          (
            window as Window & { __workerPortalBootstrapAudit?: typeof audit }
          ).__workerPortalBootstrapAudit = audit;
          let shellWasVisible = false;
          let clockWasVisible = false;
          let shellWasRemoved = false;
          const recordState = () => {
            const shell = document.getElementById("app-bootstrap-shell");
            const shellIsVisible =
              shell !== null &&
              !shell.hidden &&
              getComputedStyle(shell).display !== "none" &&
              getComputedStyle(shell).visibility !== "hidden";
            if (shellIsVisible && !shellWasVisible) {
              audit.events.push({
                type: "visible",
                atMs: performance.now(),
                rootChildren: document.getElementById("root")?.childElementCount ?? -1,
              });
              shellWasVisible = true;
            } else if (!shell && shellWasVisible && !shellWasRemoved) {
              audit.events.push({
                type: "removed",
                atMs: performance.now(),
                rootChildren: document.getElementById("root")?.childElementCount ?? -1,
              });
              shellWasRemoved = true;
            }

            const clock = document.querySelector('[data-testid="server-clock"]');
            const rect = clock?.getBoundingClientRect();
            const clockIsVisible = Boolean(
              clock &&
              rect &&
              rect.width > 0 &&
              rect.height > 0 &&
              getComputedStyle(clock).visibility !== "hidden",
            );
            if (clockIsVisible && !clockWasVisible) {
              audit.events.push({
                type: "clock-visible",
                atMs: performance.now(),
                rootChildren: document.getElementById("root")?.childElementCount ?? -1,
              });
              clockWasVisible = true;
            }
          };
          new MutationObserver(recordState).observe(document, {
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
                const candidate = entry as PerformanceEntry & { element: Element | null };
                return {
                  startTime: candidate.startTime,
                  elementTag: candidate.element?.tagName ?? null,
                  isBootstrapShell: Boolean(candidate.element?.closest("#app-bootstrap-shell")),
                };
              }),
            );
          }).observe({ type: "largest-contentful-paint", buffered: true });
        });

        await loginFast(page, request, "worker");
        const cdp = await context.newCDPSession(page);
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
        await page.goto(`${baseUrl}/#/worker-portal`, { waitUntil: "domcontentloaded" });
        await expect(page.locator("#app-bootstrap-shell")).toBeVisible({
          timeout: 10_000,
        });
        await expect(page.locator('[data-testid="server-clock"]')).toBeVisible({
          timeout: 30_000,
        });
        await expect(page.locator("#app-bootstrap-shell")).toHaveCount(0);
        await page.waitForTimeout(250);

        const metrics = await page.evaluate(() => {
          const audit = (
            window as Window & { __workerPortalBootstrapAudit?: WorkerPortalBootstrapAuditState }
          ).__workerPortalBootstrapAudit;
          const fcp = audit?.paints.find((entry) => entry.name === "first-contentful-paint");
          return {
            fcpMs: fcp?.startTime ?? null,
            events: audit?.events ?? [],
            lcpEntries: audit?.lcpEntries ?? [],
          };
        });
        const shellVisibleEvent = metrics.events.find((event) => event.type === "visible");
        const clockVisibleEvent = metrics.events.find((event) => event.type === "clock-visible");
        const shellRemovedEvent = metrics.events.find((event) => event.type === "removed");
        const shellLcp = metrics.lcpEntries.find((entry) => entry.isBootstrapShell);
        samples.push({
          sample,
          fcpMs: metrics.fcpMs,
          shellLcpMs: shellLcp?.startTime ?? null,
          shellVisibleAtMs: shellVisibleEvent?.atMs ?? null,
          rootChildrenAtShellPaint: shellVisibleEvent?.rootChildren ?? null,
          clockVisibleAtMs: clockVisibleEvent?.atMs ?? null,
          shellRemovedAtMs: shellRemovedEvent?.atMs ?? null,
          lcpEntries: metrics.lcpEntries,
        });
        await cdp.detach();
      } finally {
        await context.close();
      }
    }

    await attachPerformanceReport(testInfo, "worker-portal-bootstrap-shell.json", {
      capturedAt: new Date().toISOString(),
      baseUrl,
      route: "/#/worker-portal",
      profile: { viewport: coldViewport, deviceScaleFactor: 1.75, cpuThrottleRate: 4 },
      sampleCount: samples.length,
      samples,
      shellLcp: summarizePerformance(
        samples.flatMap((sample) => (sample.shellLcpMs === null ? [] : [sample.shellLcpMs])),
      ),
      clockVisible: summarizePerformance(
        samples.flatMap((sample) =>
          sample.clockVisibleAtMs === null ? [] : [sample.clockVisibleAtMs],
        ),
      ),
    });

    expect(samples).toHaveLength(1);
    for (const sample of samples) {
      expect(
        sample.shellVisibleAtMs,
        `sample ${sample.sample} should show the bootstrap shell`,
      ).not.toBeNull();
      expect(sample.rootChildrenAtShellPaint).toBe(0);
      expect(
        sample.shellLcpMs,
        `sample ${sample.sample} should paint an LCP candidate in the shell`,
      ).not.toBeNull();
      expect(sample.clockVisibleAtMs).not.toBeNull();
      expect(sample.shellRemovedAtMs).toBeGreaterThanOrEqual(sample.clockVisibleAtMs ?? 0);
      expect(sample.shellLcpMs).toBeLessThan(sample.clockVisibleAtMs ?? 0);
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

        const shell = page.locator("#app-bootstrap-shell");
        await expect(shell).toBeVisible({ timeout: 15_000 });
        const criticalStyle = await page.evaluate(() => {
          const shellElement = document.querySelector<HTMLElement>("#app-bootstrap-shell");
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

  test("non-shell content stays hidden until the full stylesheet is applied", async ({
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
      await page.goto(`${baseUrl}/#/configuration`, { waitUntil: "commit" });

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
      await testInfo.attach("configuration-before-global-css.png", {
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

      await expect(page.locator("#app-bootstrap-shell")).toBeVisible();
      await page.clock.fastForward(8_001);
      await expect(page.locator("#app-bootstrap-shell")).toHaveCount(0);
      await expect(page.locator("#root")).toHaveCSS("visibility", "visible");
    } finally {
      releaseCss?.();
      await context.close();
    }
  });

  test("Bootstrap shell requires a session and covers authenticated Time Control startup", async ({
    browser,
    request,
  }) => {
    const unauthenticatedContext = await browser.newContext({ viewport });
    try {
      const page = await unauthenticatedContext.newPage();
      await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
      await expect(page.locator("#app-bootstrap-shell")).toHaveCount(0);
      await expect(page.locator("#username")).toBeVisible({ timeout: 30_000 });
      await page.goto(`${baseUrl}/#/worker-portal`, { waitUntil: "domcontentloaded" });
      await expect(page.locator("#app-bootstrap-shell")).toHaveCount(0);
    } finally {
      await unauthenticatedContext.close();
    }

    const authenticatedContext = await browser.newContext({ viewport });
    try {
      const page = await authenticatedContext.newPage();
      await loginFast(page, request, "admin");
      await page.goto(`${baseUrl}/#/time-control`, { waitUntil: "domcontentloaded" });
      await expect(page.locator("#app-bootstrap-shell")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Preparando el portal", exact: true }),
      ).toBeVisible();
      await expect(page.getByTestId("main-content")).toBeVisible({ timeout: 30_000 });
      await expect(page.locator("#app-bootstrap-shell")).toHaveCount(0);
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
      await page.goto(`${baseUrl}/#/time-control`, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/#\/worker-portal/, { timeout: 30_000 });
      await expect(page.locator("#app-bootstrap-shell")).toHaveCount(0);
    } finally {
      await restrictedContext.close();
    }
  });

  test("Bootstrap shell clears after query and route changes during cold boot", async ({
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
      const shell = page.getByRole("heading", { name: "Preparando el portal" });
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
      await expect(page.locator("#app-bootstrap-shell")).toHaveCount(0);
    } finally {
      await context.close();
    }

    const workerContext = await browser.newContext({ viewport });
    try {
      const page = await workerContext.newPage();
      await loginFast(page, request, "worker");
      await page.route("**/assets/index-*.js", (route) =>
        route.fulfill({ status: 200, contentType: "text/javascript", body: "" }),
      );
      await page.goto(`${baseUrl}/#/worker-portal`, { waitUntil: "domcontentloaded" });
      const shell = page.getByRole("heading", { name: "Preparando el portal" });
      await expect(shell).toBeVisible();

      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            window.addEventListener("hashchange", () => resolve(), { once: true });
            window.location.hash = "#/time-control";
          }),
      );
      await expect(page.locator("#app-bootstrap-shell")).toHaveCount(0);
    } finally {
      await workerContext.close();
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

  test("theme bootstrap applies the stored theme without a second DOM transition pass", async ({
    browser,
    request,
  }, testInfo) => {
    const context = await browser.newContext({ viewport });
    try {
      const page = await context.newPage();
      await loginFast(page, request, "admin");
      await page.addInitScript(() => {
        localStorage.setItem("app-theme", "dark");
        const audit = { transitionStyleInsertions: 0 };
        (
          window as Window & {
            __themeBootstrapAudit?: typeof audit;
          }
        ).__themeBootstrapAudit = audit;
        new MutationObserver((records) => {
          for (const record of records) {
            for (const node of record.addedNodes) {
              if (node instanceof HTMLStyleElement && node.id === "disable-transitions") {
                audit.transitionStyleInsertions += 1;
              }
            }
          }
        }).observe(document, { childList: true, subtree: true });
      });

      await page.goto(`${baseUrl}/#/dashboard`, { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("main-content")).toBeVisible({ timeout: 30_000 });
      await page.evaluate(
        () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
      );

      const audit = await page.evaluate(() => ({
        darkThemeApplied: document.documentElement.classList.contains("dark"),
        transitionStyleInsertions: (
          window as Window & {
            __themeBootstrapAudit?: { transitionStyleInsertions: number };
          }
        ).__themeBootstrapAudit?.transitionStyleInsertions,
      }));

      await attachPerformanceReport(testInfo, "theme-bootstrap-audit.json", {
        capturedAt: new Date().toISOString(),
        baseUrl,
        route: "/#/dashboard",
        storedTheme: "dark",
        ...audit,
      });

      expect(audit.darkThemeApplied).toBe(true);
      expect(audit.transitionStyleInsertions).toBe(0);
    } finally {
      await context.close();
    }
  });

  test("Time Control overlaps its route chunk with the layout on a cold visit", async ({
    browser,
    request,
  }, testInfo) => {
    const samples: Array<{
      sample: number;
      coldEditModalRequests: string[];
      routeChunkRequests: { persistentLayout: string[]; timeControl: string[] };
      routeChunkTimings: {
        persistentLayout: { path: string; startTime: number; responseEnd: number }[];
        timeControl: { path: string; startTime: number; responseEnd: number }[];
      };
      apiRequests: { path: string; statusCode: number | null }[];
      scriptAssetCount: number;
      scriptTransferBytes: number;
    }> = [];
    const mobileViewport = { width: 412, height: 823 };

    for (let sample = 1; sample <= 1; sample += 1) {
      const context = await browser.newContext({
        viewport: mobileViewport,
        deviceScaleFactor: 1.75,
        isMobile: true,
        hasTouch: true,
        serviceWorkers: "block",
        timezoneId: "America/Santiago",
      });
      try {
        const page = await context.newPage();
        await loginFast(page, request, "admin");
        const cdp = await context.newCDPSession(page);
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

        const coldEditModalRequests: string[] = [];
        const routeChunkRequests = {
          persistentLayout: [] as string[],
          timeControl: [] as string[],
        };
        const apiRequests: { path: string; statusCode: number | null }[] = [];
        const apiRequestIndexes = new Map<Request, number>();
        page.on("request", (pageRequest) => {
          const url = pageRequest.url();
          if (pageRequest.resourceType() === "script") {
            if (/\/assets\/EditTimestampModal\.container-[^/?]+\.js(?:[?#]|$)/.test(url)) {
              coldEditModalRequests.push(url);
            }
            if (/\/assets\/PersistentLayout-[^/?]+\.js(?:[?#]|$)/.test(url)) {
              routeChunkRequests.persistentLayout.push(url);
            }
            if (/\/assets\/TimeControl\.container-[^/?]+\.js(?:[?#]|$)/.test(url)) {
              routeChunkRequests.timeControl.push(url);
            }
          }
          const pathname = new URL(url).pathname;
          if (pathname.startsWith("/api/")) {
            apiRequestIndexes.set(pageRequest, apiRequests.length);
            apiRequests.push({ path: pathname, statusCode: null });
          }
        });
        page.on("response", (response) => {
          const index = apiRequestIndexes.get(response.request());
          const apiRequest = index === undefined ? undefined : apiRequests[index];
          if (apiRequest) apiRequest.statusCode = response.status();
        });

        await page.goto(`${baseUrl}/#/time-control`, { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: "Control de Asistencia" })).toBeVisible({
          timeout: 30_000,
        });
        await page.waitForLoadState("networkidle");

        const browserResources = await page.evaluate(() => {
          const resources = performance
            .getEntriesByType("resource")
            .filter((entry): entry is PerformanceResourceTiming => {
              return (
                entry.initiatorType === "script" &&
                new URL(entry.name).pathname.includes("/assets/")
              );
            });
          const routeChunks = resources.map((resource) => ({
            path: new URL(resource.name).pathname,
            startTime: resource.startTime,
            responseEnd: resource.responseEnd,
          }));
          return {
            scriptAssetCount: resources.length,
            scriptTransferBytes: resources.reduce(
              (total, resource) => total + resource.transferSize,
              0,
            ),
            routeChunkTimings: {
              persistentLayout: routeChunks.filter((resource) =>
                /\/PersistentLayout-[^/]+\.js$/.test(resource.path),
              ),
              timeControl: routeChunks.filter((resource) =>
                /\/TimeControl\.container-[^/]+\.js$/.test(resource.path),
              ),
            },
          };
        });

        samples.push({
          sample,
          coldEditModalRequests,
          routeChunkRequests,
          routeChunkTimings: browserResources.routeChunkTimings,
          apiRequests,
          scriptAssetCount: browserResources.scriptAssetCount,
          scriptTransferBytes: browserResources.scriptTransferBytes,
        });
        await cdp.detach();
      } finally {
        await context.close();
      }
    }

    const report = {
      capturedAt: new Date().toISOString(),
      baseUrl,
      route: "/#/time-control",
      profile: { viewport: mobileViewport, deviceScaleFactor: 1.75, cpuThrottleRate: 4 },
      sampleCount: samples.length,
      samples,
    };
    await attachPerformanceReport(testInfo, "time-control-route-chunk-waterfall.json", report);

    expect(samples).toHaveLength(1);
    for (const sample of samples) {
      expect(
        sample.coldEditModalRequests,
        "The timestamp editor chunk must stay out of the cold Time Control route",
      ).toEqual([]);
      expect(sample.routeChunkRequests.persistentLayout).toHaveLength(1);
      expect(sample.routeChunkRequests.timeControl).toHaveLength(1);
      expect(sample.routeChunkTimings.persistentLayout).toHaveLength(1);
      expect(sample.routeChunkTimings.timeControl).toHaveLength(1);
      expect(
        sample.routeChunkTimings.timeControl[0].startTime,
        `Time Control should start before the layout finishes in sample ${sample.sample}`,
      ).toBeLessThan(sample.routeChunkTimings.persistentLayout[0].responseEnd);
      expect(
        sample.apiRequests.length,
        `Sample ${sample.sample} should retain the baseline startup request range`,
      ).toBeGreaterThanOrEqual(11);
      expect(sample.apiRequests.length).toBeLessThanOrEqual(12);
      expect(
        sample.apiRequests.every((apiRequest) => apiRequest.statusCode === 200),
        `All API requests should return HTTP 200 in sample ${sample.sample}`,
      ).toBe(true);
    }
  });

  test("Worker Portal defers correction modal code until a correction is opened", async ({
    browser,
    request,
  }, testInfo) => {
    const context = await browser.newContext({ viewport });
    const scriptRequests: string[] = [];
    try {
      const page = await context.newPage();
      page.on("request", (resourceRequest) => {
        if (resourceRequest.resourceType() === "script") {
          scriptRequests.push(resourceRequest.url());
        }
      });

      await loginFast(page, request, "worker");
      await page.goto(`${baseUrl}/#/worker-portal`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "Portal del Trabajador" })).toBeVisible({
        timeout: 30_000,
      });
      await page.waitForLoadState("networkidle");

      const correctionChunkRequests = scriptRequests.filter((url) =>
        /correctionrequestmodal|\/validation-[^/?]+\.js(?:[?#]|$)/i.test(new URL(url).pathname),
      );
      const scriptAssets = scriptRequests.map((url) => new URL(url).pathname.split("/").pop());
      const report = {
        capturedAt: new Date().toISOString(),
        baseUrl,
        route: "/#/worker-portal",
        role: "worker",
        dataMutation: false,
        scriptAssets,
        correctionChunkRequests,
      };

      await attachPerformanceReport(testInfo, "worker-portal-deferred-correction.json", report);
      expect(
        correctionChunkRequests,
        "Worker Portal must not download correction modal or validation code before opening a correction",
      ).toEqual([]);
    } finally {
      await context.close();
    }
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
});
