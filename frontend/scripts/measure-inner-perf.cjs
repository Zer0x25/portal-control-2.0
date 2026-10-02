const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Login (Production port 4174)
  await page.goto("http://localhost:4174");
  await page.fill("#username", "admin");
  await page.fill("#password", "999.666");
  await page.click('button:has-text("Acceder")');
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  console.log("🚀 Midiendo tiempo de RENDERIZADO EN PRODUCCIÓN (16 registros)...");

  // 2. Medir
  await page.addInitScript(() => {
    window.renderStart = performance.now();
  });

  const startTime = Date.now();
  await page.goto("http://localhost:4174/audit-logs");

  // Esperar selector de datos
  await Promise.any([
    page.waitForSelector("div[style*='transform: translateY']", { state: "attached" }),
    page.waitForSelector("text=No se han detectado eventos", { state: "visible" }),
  ]);

  const endTime = Date.now();

  console.log("\n--- 🏭 REPORTE DE RENDIMIENTO: PRODUCTO FINAL ---");
  console.log(`⏱️  Tiempo carga PROD (Red + Render): ${endTime - startTime}ms`);
  console.log(
    `💡 Con 16 registros y código minificado, esto es el rendimiento real para el usuario.`,
  );
  console.log("-------------------------------------------------\n");

  await browser.close();
})();
