import { OvertimeValidationService } from "../backend/src/services/OvertimeValidationService";
import { KpiEngine } from "../backend/src/services/kpi/KpiEngine";

console.log("---------------------------------------------------");
console.log("  VERIFICACIÓN DE REGLAS DE NEGOCIO (ESCENARIOS COMPLETOS)");
console.log("---------------------------------------------------");

const today = "2023-10-27";

// --- VALIDATION SERVICE TESTS (Manual Edits) ---
console.log("\n[1] VALIDATION RULES (Edición Manual / Solicitudes)");
const validationTests = [
  // Normal Shift (9h scheduled)
  {
    name: "Normal (9h) - On Time",
    sched: 9,
    start: "08:00",
    end: "18:00",
    valid: true,
  },
  {
    name: "Normal (9h) - 2h OT",
    sched: 9,
    start: "08:00",
    end: "20:00",
    valid: true,
  },
  {
    name: "Normal (9h) - 3h OT",
    sched: 9,
    start: "08:00",
    end: "21:00",
    valid: false,
    reason: "Excede límite 2h",
  },

  // Long Shift (12h presence: 08:00 - 20:00. Net: 11h)
  {
    name: "Long (12h) - On Time",
    sched: 11,
    start: "08:00",
    end: "20:00",
    valid: true,
  }, // 12h gross - 1h break = 11h net. Sched 11. OT 0.
  {
    name: "Long (12h) - 1h OT",
    sched: 11,
    start: "08:00",
    end: "21:00",
    valid: false,
    reason: "Jornada larga no permite OT",
  }, // 13h gross - 1 break = 12h net. Sched 11. OT 1. Blocked.

  // Unscheduled Shift (0h scheduled)
  {
    name: "Unscheduled - 10h",
    sched: 0,
    start: "08:00",
    end: "18:00",
    valid: true,
  }, // 10h total. < 12h limit. OK.
  {
    name: "Unscheduled - 12h",
    sched: 0,
    start: "08:00",
    end: "20:00",
    valid: true,
  }, // 12h total. = 12h limit. OK.
  {
    name: "Unscheduled - 13h",
    sched: 0,
    start: "08:00",
    end: "21:00",
    valid: false,
    reason: "Excede tope legal 12h",
  }, // 13h total. > 12h limit. Blocked.

  // Short Shift (5h scheduled - Part Time)
  {
    name: "Short (5h) - 2h OT",
    sched: 5,
    start: "08:00",
    end: "15:00",
    valid: true,
  }, // 7h total - 0.5 break = 6.5h? No, <6h duration no break.
  // Logic: if worked > 6. Here worked = 7.
  // Net = 7 - 0.5 = 6.5. OT = 1.5. OK.
  {
    name: "Short (5h) - 3h OT",
    sched: 5,
    start: "08:00",
    end: "16:30",
    valid: false,
    reason: "Excede límite 2h",
  }, // 8.5h - 0.5 = 8h. OT 3. Blocked.
];

validationTests.forEach((t) => {
  const res = OvertimeValidationService.validate(
    t.sched,
    `${today}T${t.start}:00`,
    `${today}T${t.end}:00`,
  );
  const pass = res.valid === t.valid;
  console.log(
    `   ${t.name.padEnd(25)} | Expected: ${t.valid ? "OK " : "BLK"} | Got: ${res.valid ? "OK " : "BLK"} | ${pass ? "✅" : "❌"} ${!res.valid ? "(" + res.message + ")" : ""}`,
  );
});

// --- KPI ENGINE TESTS (Punch Calculations) ---
console.log("\n[2] KPI CALCULATION (Marcajes Reales)");

const kpiTestsRaw = [
  // Scenario 1: Normal Shift 9h (08:00 - 18:00)
  {
    name: "Normal - Exacto",
    sched: 9,
    in: "08:00",
    out: "18:00",
    expectedWork: 9,
    expectedOT: 0,
  },
  {
    name: "Normal - +1h Extra", // 08:00 - 19:00 (11h duration - 1h break = 10h worked) -> 1h OT
    sched: 9,
    in: "08:00",
    out: "19:00",
    expectedWork: 10,
    expectedOT: 1,
  },
  {
    name: "Normal - +3h Extra", // 08:00 - 21:00 (13h duration - 1h break = 12h worked) -> 3h OT
    // NOTE: KPI should CALCULATE it (even if illegal) so it can be paid/audited.
    sched: 9,
    in: "08:00",
    out: "21:00",
    expectedWork: 12,
    expectedOT: 3,
  },

  // Scenario 2: Long Shift 12h (08:00 - 20:00) => Net 11h
  {
    name: "Largo - Exacto",
    sched: 11,
    in: "08:00",
    out: "20:00",
    expectedWork: 11,
    expectedOT: 0,
  },
  {
    name: "Largo - Salida Tarde (+2h)", // 08:00 - 22:00 (14h duration)
    // 14h - 1h break = 13h worked.
    // Sched 11. Raw OT = 2.
    // Expected Clamped OT = 0.
    sched: 11,
    in: "08:00",
    out: "22:00",
    expectedWork: 13,
    expectedOT: 0,
  },
];

kpiTestsRaw.forEach((t) => {
  // We mock the record
  const record = {
    id: "test",
    date: today,
    scheduledHours: t.sched,
    entrada: new Date(`${today}T${t.in}:00`),
    salida: new Date(`${today}T${t.out}:00`),
    status: "Completado",
    justification: null,
  };

  // Simple heuristic for KpiEngine inputs: 1h break for tests
  const metrics = KpiEngine.calculateDailyMetrics(
    record as any,
    {
      isWorkDay: true,
      hours: t.sched,
      hasColacion: true,
      colacionMinutes: 60,
    } as any,
    t.sched >= 11 ? "Artículo 22" : "Normal",
  );
  // FORCE "Normal" type validation logic for test consistency
  if (t.sched >= 11) {
    const m2 = KpiEngine.calculateDailyMetrics(
      record as any,
      {
        isWorkDay: true,
        hours: t.sched,
        hasColacion: true,
        colacionMinutes: 60,
      } as any,
      "Normal",
    );
    console.log(
      `   ${t.name.padEnd(25)} | Work: ${m2.workedHours} (Exp: ${t.expectedWork}) | OT: ${m2.overtimeHours} (Exp: ${t.expectedOT}) | ${m2.overtimeHours === t.expectedOT ? "✅" : "❌"}`,
    );
  } else {
    console.log(
      `   ${t.name.padEnd(25)} | Work: ${metrics.workedHours} (Exp: ${t.expectedWork}) | OT: ${metrics.overtimeHours} (Exp: ${t.expectedOT}) | ${metrics.overtimeHours === t.expectedOT ? "✅" : "❌"}`,
    );
  }
});

// --- ANOMALY RECOGNITION TESTS ---
console.log("\n[3] ANOMALY RECOGNITION");

const anomRecord = {
  id: "anom1",
  date: today,
  scheduledHours: 9,
  entrada: new Date(`${today}T08:00:00`),
  salida: null,
  status: "AnomaliaManual",
  justification: JSON.stringify({ type: "Reconocida", reason: "Ok" }),
};

const anomMetrics = KpiEngine.calculateDailyMetrics(
  anomRecord as any,
  { isWorkDay: true, hours: 9 } as any,
  "Normal",
);

const isNeutral = anomMetrics.workedHours === 9 && anomMetrics.overtimeHours === 0;
console.log(
  `   Anomaly (Reconocida)      | Work: ${anomMetrics.workedHours} (Exp: 9) | OT: ${anomMetrics.overtimeHours} (Exp: 0) | ${isNeutral ? "✅" : "❌"}`,
);
