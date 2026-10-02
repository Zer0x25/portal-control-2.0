import { execSync } from "child_process";
import path from "path";

/**
 * Script Maestro de Verificación de Lógica
 * Ejecuta todas las pruebas de integración backend para validar los flujos críticos
 */

const tests = [
  { name: "Asistencia (Punch In/Out)", file: "tests/integration/attendance.test.ts" },
  { name: "Turnos (Patrones y Asignación)", file: "tests/integration/shifts.test.ts" },
  { name: "Permisos (Creación y Limpieza)", file: "tests/integration/leaves.test.ts" },
];

console.log("\x1b[36m%s\x1b[0m", "\n🚀 Iniciando Verificación Maestra de Flujos Críticos...\n");

let allPassed = true;

tests.forEach((test, index) => {
  console.log(`[${index + 1}/${tests.length}] Verificando: ${test.name}...`);
  try {
    // Run vitest for the specific file
    execSync(`npx vitest run ${test.file}`, {
      stdio: "inherit",
      cwd: path.resolve(__dirname, ".."),
    });
    console.log("\x1b[32m%s\x1b[0m", `✅ ${test.name} completado.\n`);
  } catch (error) {
    console.log("\x1b[31m%s\x1b[0m", `❌ Error en ${test.name}.\n`);
    allPassed = false;
  }
});

if (allPassed) {
  console.log(
    "\x1b[32m%s\x1b[0m",
    "✨ TODOS LOS FLUJOS LÓGICOS ESTÁN VERIFICADOS Y FUNCIONALES ✨\n",
  );
  process.exit(0);
} else {
  console.log("\x1b[31m%s\x1b[0m", "⚠️ ALGUNOS FLUJOS FALLARON. REVISAR LOGS SUPERIORES.\n");
  process.exit(1);
}
