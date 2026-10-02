const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: false }); // Visible para que el usuario pueda interactuar/ver
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("🛠️  AUDITORÍA DE ESTRÉS: Control de Tiempo");
  console.log("👉 Por favor, logeate y navega a /time-control en la ventana que se abrió.");
  console.log(
    "🚦 Cuando estés listo, presiona ENTER en esta terminal para iniciar la medición de interacción...",
  );

  await page.goto("http://localhost:4173/");

  // Esperar input de la terminal
  const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const waitForEnter = () => new Promise((resolve) => readline.question("", resolve));
  await waitForEnter();

  console.log("🚀 Iniciando recolección de métricas durante interacción (10 segundos)...");

  // Inyectar observadores de rendimiento
  await page.evaluate(() => {
    window.longTasks = [];
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.longTasks.push({
          duration: entry.duration,
          startTime: entry.startTime,
          name: entry.name,
        });
      }
    });
    observer.observe({ entryTypes: ["longtask"] });
  });

  // Simular Scroll Agresivo
  console.log("🖱️  Simulando scroll agresivo...");
  for (let i = 0; i < 20; i++) {
    await page.mouse.wheel(0, 1000);
    await page.waitForTimeout(100);
  }

  // Recolectar resultados
  const results = await page.evaluate(() => {
    return {
      longTasks: window.longTasks,
      totalLongTaskTime: window.longTasks.reduce((sum, t) => sum + t.duration, 0),
      maxLongTask: Math.max(...window.longTasks.map((t) => t.duration), 0),
    };
  });

  console.log("\n--- 🏁 RESULTADOS DE INTERACCIÓN ---");
  console.log(`⚠️  Tareas largas detectadas (>50ms): ${results.longTasks.length}`);
  console.log(`⏱️  Tiempo total bloqueado: ${results.totalLongTaskTime.toFixed(2)}ms`);
  console.log(`🔥 Tarea más larga: ${results.maxLongTask.toFixed(2)}ms`);

  if (results.maxLongTask > 100) {
    console.log("❌ CRÍTICO: Se detectaron bloqueos perceptibles (>100ms).");
  } else if (results.longTasks.length > 5) {
    console.log("⚠️ ADVERTENCIA: Hay demasiadas tareas pequeñas bloqueando el hilo.");
  } else {
    console.log("✅ EXCELENTE: El hilo principal está fluido.");
  }
  console.log("-------------------------------------\n");

  readline.close();
  // No cerramos el browser para que el usuario pueda seguir viendo
})();
