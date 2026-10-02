// Mocking the logic found in PunchService to verify the Anomaly Flagging
// since we cannot easily run the full PunchService with DB dependencies here.

function simulatePunchOutput(
  action: string,
  updateField: string,
  recordEntrada: Date | null,
  punchTime: Date,
): { status: string; justification: any } {
  let nextStatus = "Completado"; // Default from determineNextPunchAction
  let autoJustification = null;

  // --- LOGIC UNDER TEST ---
  if ((action === "SALIDA" || updateField === "salida") && recordEntrada) {
    const entryTime = recordEntrada.getTime();
    const exitTime = punchTime.getTime();
    const durationHours = (exitTime - entryTime) / (1000 * 60 * 60);

    if (durationHours > 12) {
      nextStatus = "AnomaliaManual";
      autoJustification = {
        type: "ExcesoJornada",
        reason: `Exceso de Jornada Legal (+12h). Duración: ${durationHours.toFixed(1)}h`,
      };
    }
  }
  // ------------------------

  return { status: nextStatus, justification: autoJustification };
}

console.log("---------------------------------------------------");
console.log("  VERIFICACIÓN DE LÓGICA DE MARCAJE (PUNCH SERVICE)");
console.log("---------------------------------------------------");

const today = "2023-10-27";
const entrada = new Date(`${today}T08:00:00`);

const scenarios = [
  { name: "Normal (9h)", out: "17:00", expStatus: "Completado", expJust: null },
  { name: "Long (12h)", out: "20:00", expStatus: "Completado", expJust: null },
  {
    name: "Limit (12h 1m)",
    out: "20:01",
    expStatus: "AnomaliaManual",
    expJust: "ExcesoJornada",
  }, // > 12.0
  {
    name: "Extreme (14h)",
    out: "22:00",
    expStatus: "AnomaliaManual",
    expJust: "ExcesoJornada",
  },
];

scenarios.forEach((s) => {
  const salida = new Date(`${today}T${s.out}:00`);
  const res = simulatePunchOutput("SALIDA", "salida", entrada, salida);

  const statusMatch = res.status === s.expStatus;
  const justMatch = s.expJust ? res.justification?.type === s.expJust : res.justification === null;

  console.log(
    `[${s.name.padEnd(15)}] Status: ${res.status.padEnd(14)} (${s.expStatus}) | Justif: ${res.justification?.type || "null"} (${s.expJust || "null"}) | ${statusMatch && justMatch ? "✅" : "❌"}`,
  );
});
