import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { attachPerformanceReport } from "./helpers/performance-metrics";

const baseUrl = process.env.E2E_BASE_URL || "http://127.0.0.1:8080";
const sample = "ÁÉÍÓÚÜÑ áéíóúüñ ¿Qué? ¡Sí! Muñoz — € $ CLP 0123456789 08:59 → −";
const variants = [
  ...[400, 500, 600, 700, 800, 900].map((weight) => ({ family: "Inter", weight })),
  ...[400, 700].map((weight) => ({ family: "Roboto Mono", weight })),
];

async function mountSpecimen(page: Page, request: APIRequestContext) {
  const response = await request.get(baseUrl);
  expect(response.ok()).toBeTruthy();
  const html = await response.text();
  const styles = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)];
  expect(styles.length, "staging must serve the built stylesheet").toBeGreaterThan(0);
  const fixtureUrl = `${baseUrl}/__font-specimen`;
  await page.route(fixtureUrl, (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><html><body></body></html>" }),
  );
  await page.goto(fixtureUrl);
  await page.setContent(`<!doctype html><html lang="es"><head>
    ${styles.map((match) => `<link rel="stylesheet" href="${new URL(match[1], baseUrl)}">`).join("")}
    <style>body{margin:0;padding:24px;background:white;color:#162530;font-synthesis:none}
    p{margin:0 0 20px;font-size:20px;line-height:1.6}h1{font:24px system-ui;margin:0 0 24px}</style>
    </head><body><h1>Portal · muestra tipográfica</h1>
    ${variants.map(({ family, weight }) => `<p style="font-family:'${family}';font-weight:${weight}">${family} ${weight}<br>${sample}</p>`).join("")}
    </body></html>`);
  await page.evaluate(
    async ({ variants, sample }) => {
      await Promise.all(
        variants.map(({ family, weight }) =>
          document.fonts.load(`${weight} 20px "${family}"`, sample),
        ),
      );
      await document.fonts.ready;
    },
    { variants, sample },
  );
}

test.use({ viewport: { width: 1200, height: 1100 }, deviceScaleFactor: 1 });

test("shared Latin fonts load small subsets and preserve the specimen", async ({
  page,
  request,
}, testInfo) => {
  const fontRequests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "font") fontRequests.push(request.url());
  });
  await mountSpecimen(page, request);
  const screenshot = await page.screenshot();
  const output = process.env.FONT_SPECIMEN_OUTPUT;
  if (output) {
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, screenshot);
  }
  if (process.env.FONT_SPECIMEN_REFERENCE) {
    const reference = await readFile(process.env.FONT_SPECIMEN_REFERENCE);
    expect(createHash("sha256").update(screenshot).digest("hex")).toBe(
      createHash("sha256").update(reference).digest("hex"),
    );
  }
  await testInfo.attach("font-specimen.png", { body: screenshot, contentType: "image/png" });
  expect(fontRequests).toHaveLength(5);
  expect(fontRequests.every((url) => /-latin-[^/]+\.woff2$/.test(url))).toBeTruthy();
  const encodedBytes = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter((entry): entry is PerformanceResourceTiming => entry.name.endsWith(".woff2"))
      .reduce((total, entry) => total + entry.encodedBodySize, 0),
  );
  expect(encodedBytes).toBeGreaterThan(0);
  expect(encodedBytes).toBeLessThan(150_000);
  await attachPerformanceReport(testInfo, "font-latin.json", {
    capturedAt: new Date().toISOString(),
    baseUrl,
    fontRequests,
    encodedBytes,
    specimenSha256: createHash("sha256").update(screenshot).digest("hex"),
    comparedWithOriginal: Boolean(process.env.FONT_SPECIMEN_REFERENCE),
  });
});

test("other alphabets load the original faces only when needed", async ({
  page,
  request,
}, testInfo) => {
  await mountSpecimen(page, request);
  const extraFontRequests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "font") extraFontRequests.push(request.url());
  });
  const loaded = await page.evaluate(async () => {
    const faces = await Promise.all([
      document.fonts.load('400 20px "Inter"', "ЖΩ"),
      document.fonts.load('700 20px "Roboto Mono"', "ЖΩ"),
    ]);
    return faces.map((group) =>
      group.map((face) => ({ family: face.family, status: face.status })),
    );
  });
  expect(
    loaded.every((group) => group.length > 0 && group.every((face) => face.status === "loaded")),
  ).toBeTruthy();
  expect(extraFontRequests).toHaveLength(2);
  expect(extraFontRequests.some((url) => /\/Inter-Regular-[^/]+\.woff2$/.test(url))).toBeTruthy();
  expect(extraFontRequests.some((url) => /\/RobotoMono-Bold-[^/]+\.woff2$/.test(url))).toBeTruthy();
  await attachPerformanceReport(testInfo, "font-fallback.json", {
    capturedAt: new Date().toISOString(),
    baseUrl,
    text: "ЖΩ",
    extraFontRequests,
    loaded,
  });
});
