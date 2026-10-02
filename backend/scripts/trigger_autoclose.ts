import { processAutoClosures } from "./src/services/autoCloseService";

async function trigger() {
  console.log("Ejecutando proceso de cierre automático manualmente...");
  const result = await processAutoClosures();
  console.log(`Resultado: ${result} registros cerrados.`);
}

trigger().catch(console.error);
