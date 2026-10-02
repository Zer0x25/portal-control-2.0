const { chromium, devices } = require("playwright");

(async () => {
  // Emulate iPhone 12 Pro
  const mobileDevice = devices["iPhone 12 Pro"];
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    ...mobileDevice,
    recordVideo: { dir: "stress-test-results" }, // Optional recording
  });
  const page = await context.newPage();

  console.log("\n📱 INICIANDO AUDITORÍA MÓVIL (iPhone 12 Pro)...");
  console.log("-----------------------------------------------");

  // 1. Inyectar observador de Tareas Largas y FPS
  await page.addInitScript(() => {
    window.longTasks = [];
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          // Umbral de task largo > 50ms
          window.longTasks.push(entry.duration);
        }
      }
    });
    observer.observe({ entryTypes: ["longtask"] });

    // Medidor de FPS simple
    window.fps = 0;
    let frames = 0;
    let prevTime = performance.now();

    function loop() {
      frames++;
      const time = performance.now();
      if (time - prevTime >= 1000) {
        window.fps = frames;
        frames = 0;
        prevTime = time;
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  });

  // 2. Navegación y Login
  console.log("🔐 Autenticando...");
  await page.goto("http://localhost:4173/#/login");
  await page.fill("#username", "admin");
  await page.fill("#password", "999.666");
  await page.click('button:has-text("Acceder")');

  // Esperar navegación
  await page.waitForURL("**/dashboard");
  console.log("✅ Login exitoso.");

  // 3. Ir a Control de Tiempo
  console.log("📂 Navegando a Control de Tiempo...");
  await page.goto("http://localhost:4173/#/time-control");

  // Esperar a que la tabla cargue (Mobile usa Intersection Observer, no Virtualizer del todo igual)
  await page.waitForSelector("text=Control de Asistencia");
  // Esperar un poco a que carguen los registros iniciales
  await page.waitForTimeout(2000);

  // 4. Prueba de Estrés de Scroll (Simular Touch)
  console.log("👆 Simulando Scroll en móvil (Touch)...");

  // Capturar métricas antes
  const startMetrics = await page.evaluate(() => ({
    time: performance.now(),
    longTasks: [...window.longTasks],
  }));

  // Simular movimiento de dedo (Touch scroll)
  // Haremos varios "swipes" hacia arriba para disparar el infinite scroll
  for (let i = 0; i < 15; i++) {
    // Touch start
    await page.touchscreen.tap(200, 600);
    // No hay "swipe" directo fácil en Playwright sin drag, usaremos mouse wheel que emula scroll event
    // O mejor, evaluamos scrollBy para consistencia, aunque touch es mejor para testear listeners

    // Fallback simple: mouse wheel funciona en emulación móvil de Playwright para scroll
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(300); // Esperar render y fetch
  }

  // Esperar que se asienten las tareas
  await page.waitForTimeout(2000);

  // 5. Recolectar Resultados
  const results = await page.evaluate(() => {
    return {
      longTasks: window.longTasks,
      fps: window.fps,
    };
  });

  const duration = results.longTasks.reduce((a, b) => a + b, 0);
  const maxTask = Math.max(...results.longTasks, 0);

  console.log("\n--- 🏁 RESULTADOS MÓVILES ---");
  console.log(`📱 Dispositivo: iPhone 12 Pro`);
  console.log(`⚠️  Tareas largas detectadas (>50ms): ${results.longTasks.length}`);
  console.log(`⏱️  Tiempo total bloqueado: ${duration.toFixed(2)}ms`);
  console.log(`🔥 Tarea más larga: ${maxTask.toFixed(2)}ms`); // Si es > 50ms es "Jank"
  console.log(`🎞️  FPS Final: ${results.fps}`);

  if (results.longTasks.length === 0) {
    console.log("✅ EXCELENTE: Scroll móvil fluido y sin bloqueos.");
  } else {
    console.log("❌ ATENCIÓN: Se detectaron bloqueos. Revisar IntersectionObserver.");
  }
  console.log("-----------------------------\n");

  await browser.close();
})();
