const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("🚀 Iniciando prueba de RENDIMIENTO en /time-control (PROD Build)...");

  // 1. Login
  await page.goto("http://localhost:4173"); // Vite preview default port
  await page.fill("#username", "admin");
  await page.fill("#password", "999.666");
  await page.click('button:has-text("Acceder")');

  // Esperar a que la app sincronice y cargue el dashboard
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  console.log("✅ Login exitoso. Esperando estabilización...");
  await page.waitForTimeout(2000); // Dar tiempo a que termine el sync inicial

  // 2. Navegar a Time Control y medir
  console.log("📈 Navegando a /time-control...");

  const startTime = Date.now();
  await page.goto("http://localhost:4173/time-control");

  // Esperar a que la tabla aparezca (virtualizer renderiza filas)
  await page.waitForSelector("div[style*='transform: translateY']", { timeout: 15000 });

  const endTime = Date.now();

  // 3. Obtener métricas de la web
  const metrics = await page.evaluate(() => {
    const [perf] = performance.getEntriesByType("navigation");
    return {
      domInteractive: perf.domInteractive,
      loadEventEnd: perf.loadEventEnd,
      transferSize: perf.transferSize,
    };
  });

  console.log("\n--- 🏁 REPORTE /TIME-CONTROL (PROD) ---");
  console.log(`⏱️  Tiempo carga total (Red + Render): ${endTime - startTime}ms`);
  console.log(`📦 Peso transferencia: ${(metrics.transferSize / 1024).toFixed(2)} KB`);
  console.log(`⚡ DOM Interactive: ${metrics.domInteractive.toFixed(2)}ms`);
  console.log("----------------------------------------\n");

  await browser.close();
  process.exit(0);
})();
