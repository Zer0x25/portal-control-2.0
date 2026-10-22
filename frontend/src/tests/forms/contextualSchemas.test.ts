import { describe, it, expect } from "vitest";

import {
  buildHolidayFormSchema,
  buildLeaveFormSchema,
  buildShiftAssignmentSchema,
  buildShiftPatternSchema,
} from "../../schemas/forms";

/**
 * Spec 036 T8 (AC2): reglas de validacion que **dependen del contexto**.
 *
 * Hay reglas que el backend no puede impose porque dependen de datos que solo
 * conoce la aplicacion (los nombres ya guardados, el maximo legal de horas, el
 * historico de ausencias del empleado). La solucion es inyectar el contexto
 * en el schema: la regla vive en la capa de validacion y el error sale como
 * el resto (campo + mensaje), no como un toast suelto.
 *
 * Estos tests fijan el comportamiento de esas reglas **por separado** de los
 * formularios que las usan.
 */

/** Patrón de turno válido (un día de trabajo de 09:00 a 17:00). */
const PATTERN = {
  name: "Turno mañana",
  cycleLengthDays: 7,
  startDayOfWeek: 1,
  color: "#F44336",
  maxHoursPattern: 40,
  worksOnHolidays: false,
  dailySchedules: [
    {
      dayIndex: 0,
      startTime: "09:00",
      endTime: "17:00",
      isOffDay: false,
      hasColacion: false,
      colacionMinutes: 0,
      hours: 8,
    },
  ],
};

describe("buildShiftPatternSchema (spec 036 T8)", () => {
  const context = {
    existingPatterns: [{ id: "otro", name: "Turno noche" }],
    editingPatternId: undefined,
    maxWeeklyHours: 44,
  };

  it("acepta un patrón válido", () => {
    const result = buildShiftPatternSchema(context).safeParse(PATTERN);
    expect(result.success).toBe(true);
  });

  it("rechaza un nombre duplicado y lo señala en el campo name", () => {
    const result = buildShiftPatternSchema({
      ...context,
      existingPatterns: [{ id: "otro", name: "Turno mañana" }],
    }).safeParse(PATTERN);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0].path).toEqual(["name"]);
    expect(result.error.issues[0].message).toContain("ya existe");
  });

  it("no considera duplicado el propio patrón que se está editando", () => {
    const result = buildShiftPatternSchema({
      ...context,
      existingPatterns: [{ id: "propio", name: "Turno mañana" }],
      editingPatternId: "propio",
    }).safeParse(PATTERN);

    expect(result.success).toBe(true);
  });

  it("rechaza las horas por encima del máximo legal configurado", () => {
    const result = buildShiftPatternSchema(context).safeParse({
      ...PATTERN,
      maxHoursPattern: 50,
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0].path).toEqual(["maxHoursPattern"]);
  });

  it("exige hora de inicio y de fin en un día que no es libre", () => {
    const result = buildShiftPatternSchema(context).safeParse({
      ...PATTERN,
      dailySchedules: [{ ...PATTERN.dailySchedules[0], startTime: "" }],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0].path).toEqual(["dailySchedules", 0, "startTime"]);
  });

  it("no exige horas en un día libre", () => {
    const result = buildShiftPatternSchema(context).safeParse({
      ...PATTERN,
      dailySchedules: [
        { ...PATTERN.dailySchedules[0], isOffDay: true, startTime: "", endTime: "" },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("exige minutos de colación válidos si la colación está marcada", () => {
    const result = buildShiftPatternSchema(context).safeParse({
      ...PATTERN,
      dailySchedules: [{ ...PATTERN.dailySchedules[0], hasColacion: true, colacionMinutes: 0 }],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0].path).toEqual(["dailySchedules", 0, "colacionMinutes"]);
  });

  it("rechaza que la colación exceda la duración del turno", () => {
    const result = buildShiftPatternSchema(context).safeParse({
      ...PATTERN,
      dailySchedules: [
        {
          ...PATTERN.dailySchedules[0],
          startTime: "09:00",
          endTime: "10:00",
          hasColacion: true,
          colacionMinutes: 120,
        },
      ],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0].path).toEqual(["dailySchedules", 0, "colacionMinutes"]);
  });

  it("admite un turno que cruza la medianoche (comportamiento previo)", () => {
    // `calculateHoursBetween` nunca devuelve negativos: el turno nocturno es
    // valido por diseno (la comprobacion `netHours < 0` del codigo anterior
    // era codigo muerto). Hallazgo documentado en el schema.
    const result = buildShiftPatternSchema(context).safeParse({
      ...PATTERN,
      dailySchedules: [{ ...PATTERN.dailySchedules[0], startTime: "17:00", endTime: "09:00" }],
    });

    expect(result.success).toBe(true);
  });
});

describe("buildShiftAssignmentSchema (spec 036 T8)", () => {
  const context = {
    patterns: [{ id: "p1", cycleLengthDays: 7 }],
    oldestAllowedStartDate: "2026-10-15",
  };

  const assignment = {
    employeeId: "emp-1",
    shiftPatternId: "p1",
    startDate: "2026-10-20",
    endDate: "2026-10-25",
  };

  it("acepta una asignación válida", () => {
    expect(buildShiftAssignmentSchema(context).safeParse(assignment).success).toBe(true);
  });

  it("rechaza una fecha de término anterior a la de inicio", () => {
    const result = buildShiftAssignmentSchema(context).safeParse({
      ...assignment,
      endDate: "2026-10-19",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0].path).toEqual(["endDate"]);
  });

  it("rechaza una asignación con más de 7 días de antigüedad", () => {
    const result = buildShiftAssignmentSchema(context).safeParse({
      ...assignment,
      startDate: "2026-10-01",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0].path).toEqual(["startDate"]);
  });

  it("exige el día 1 del mes en los patrones mensuales", () => {
    const result = buildShiftAssignmentSchema({
      ...context,
      patterns: [{ id: "p1", cycleLengthDays: 30 }],
    }).safeParse(assignment);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0].path).toEqual(["startDate"]);
  });

  it("exige fecha de término en los patrones mensuales", () => {
    const result = buildShiftAssignmentSchema({
      ...context,
      patterns: [{ id: "p1", cycleLengthDays: 30 }],
    }).safeParse({ ...assignment, startDate: "2026-10-01", endDate: undefined });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((issue) => issue.path.join(".") === "endDate")).toBe(true);
  });
});

describe("buildLeaveFormSchema (spec 036 T8)", () => {
  const context = {
    existingLeaves: [
      { id: "l1", employeeId: "emp-1", startDate: "2026-10-20", endDate: "2026-10-25" },
    ],
    editingLeaveId: undefined,
    oldestAllowedStartDate: "2026-10-15",
    today: "2026-10-22",
  };

  const leave = {
    employeeId: "emp-1",
    type: "Vacaciones",
    startDate: "2026-10-16",
    endDate: "2026-10-18",
    notes: "",
  };

  it("acepta una ausencia válida", () => {
    expect(buildLeaveFormSchema(context).safeParse(leave).success).toBe(true);
  });

  it("rechaza un rango de fechas invertido", () => {
    const result = buildLeaveFormSchema(context).safeParse({
      ...leave,
      startDate: "2026-10-25",
      endDate: "2026-10-20",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0].path).toEqual(["endDate"]);
  });

  it("rechaza una ausencia con más de 7 días de antigüedad", () => {
    const result = buildLeaveFormSchema(context).safeParse({
      ...leave,
      startDate: "2026-10-01",
      endDate: "2026-10-05",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0].path).toEqual(["startDate"]);
  });

  it("rechaza una ausencia solapada del mismo empleado", () => {
    const result = buildLeaveFormSchema(context).safeParse({
      ...leave,
      startDate: "2026-10-20",
      endDate: "2026-10-25",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0].path).toEqual(["startDate"]);
  });

  it("permite la ausencia que se está editando (no se solapa consigo misma)", () => {
    const result = buildLeaveFormSchema({
      ...context,
      editingLeaveId: "l1",
    }).safeParse({ ...leave, startDate: "2026-10-20", endDate: "2026-10-25" });

    expect(result.success).toBe(true);
  });

  it("rechaza al editar una fecha de término anterior a hoy", () => {
    const result = buildLeaveFormSchema({
      ...context,
      editingLeaveId: "l1",
      existingLeaves: [],
    }).safeParse({ ...leave, endDate: "2026-10-01" });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0].path).toEqual(["endDate"]);
  });
});

describe("buildHolidayFormSchema (spec 036 T8)", () => {
  it("acepta un feriado en una fecha libre", () => {
    const result = buildHolidayFormSchema({ existingDates: ["2026-01-01"] }).safeParse({
      date: "2026-12-25",
      name: "Navidad",
      type: "Nacional",
    });

    expect(result.success).toBe(true);
  });

  it("rechaza un feriado en una fecha ya ocupada", () => {
    const result = buildHolidayFormSchema({ existingDates: ["2026-12-25"] }).safeParse({
      date: "2026-12-25",
      name: "Navidad",
      type: "Nacional",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0].path).toEqual(["date"]);
  });
});
