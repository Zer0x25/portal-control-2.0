import { describe, it, expect } from "vitest";
import {
  determineNextPunchAction,
  shouldAutoClose,
  canExitWithIncompleteBreak,
  type PunchState,
} from "../../src/domain/attendanceRules";
import { determineDailySchedule, type DailyScheduleInput } from "../../src/domain/schedulingRules";

const empty: PunchState = { status: "Pendiente" };

function pattern7x1() {
  return {
    id: "p1",
    name: "Standard 6x1",
    cycleLengthDays: 7,
    worksOnHolidays: false,
    color: "#FFFF00",
    dailySchedules: Array.from({ length: 7 }, (_, i) => ({
      dayIndex: i,
      startTime: "08:00",
      endTime: "16:00",
      isOffDay: i === 6,
      hours: 8,
      hasColacion: true,
      colacionMinutes: 60,
    })),
  };
}

function input(overrides: Partial<DailyScheduleInput> = {}): DailyScheduleInput {
  return {
    targetDate: "2026-03-02", // Monday-ish; day 1 of cycle below
    activeAssignment: {
      startDate: "2026-03-01",
      shiftPattern: pattern7x1(),
    },
    ...overrides,
  };
}

describe("domain/attendanceRules (pure, no DB)", () => {
  describe("determineNextPunchAction", () => {
    it("walks the automated flow ENTRADA -> COLACION -> FIN -> SALIDA", () => {
      let s: PunchState = { ...empty };
      const seq = ["ENTRADA", "INICIO_COLACION", "FIN_COLACION", "SALIDA"] as const;
      const fields = ["entrada", "inicioColacion", "finColacion", "salida"] as const;
      seq.forEach((action, i) => {
        const t = determineNextPunchAction(s);
        expect(t.action).toBe(action);
        s = { ...s, [fields[i]]: "2026-03-01T08:00:00Z", status: t.nextStatus };
      });
      expect(() => determineNextPunchAction(s)).toThrow("WORKDAY_FINISHED");
    });

    it("honors forced overrides with guard errors", () => {
      expect(determineNextPunchAction(empty, "entrada").action).toBe("ENTRADA");
      expect(() => determineNextPunchAction({ ...empty, entrada: "x" }, "entrada")).toThrow(
        "ALREADY_PUNCHED_IN",
      );
      expect(() => determineNextPunchAction(empty, "fin_colacion")).toThrow("NO_BREAK_STARTED");
      expect(() =>
        determineNextPunchAction(
          { ...empty, inicioColacion: "x", finColacion: "y" },
          "fin_colacion",
        ),
      ).toThrow("ALREADY_BREAK_FINISHED");
      expect(() => determineNextPunchAction({ ...empty, salida: "x" }, "salida")).toThrow(
        "ALREADY_PUNCHED_OUT",
      );
    });
  });

  describe("shouldAutoClose", () => {
    it("never closes finished or anomalous records", () => {
      expect(
        shouldAutoClose({ ...empty, status: "Completado", entrada: "2000-01-01T00:00:00Z" }),
      ).toBe(false);
      expect(
        shouldAutoClose({ ...empty, status: "AnomaliaManual", entrada: "2000-01-01T00:00:00Z" }),
      ).toBe(false);
    });

    it("closes stale open records, keeps fresh ones (run-date independent)", () => {
      const old = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const fresh = new Date(Date.now() - 3600 * 1000).toISOString();
      expect(shouldAutoClose({ ...empty, status: "Laborando", entrada: old })).toBe(true);
      expect(shouldAutoClose({ ...empty, status: "Laborando", entrada: fresh })).toBe(false);
      expect(shouldAutoClose({ ...empty, status: "Laborando" })).toBe(false);
    });
  });

  describe("canExitWithIncompleteBreak", () => {
    const now = new Date("2026-03-01T12:00:00Z");
    it("denies without break start or with finished break", () => {
      expect(canExitWithIncompleteBreak(null, null, now).allowed).toBe(false);
      expect(
        canExitWithIncompleteBreak("2026-03-01T10:00:00Z", "2026-03-01T11:00:00Z", now).allowed,
      ).toBe(false);
    });

    it("requires strictly over 60 minutes of break", () => {
      const recent = canExitWithIncompleteBreak("2026-03-01T11:30:00Z", null, now);
      expect(recent.allowed).toBe(false);
      expect(recent.elapsedBreakMinutes).toBe(30);
      const old = canExitWithIncompleteBreak("2026-03-01T10:30:00Z", null, now);
      expect(old.allowed).toBe(true);
      expect(old.elapsedBreakMinutes).toBe(90);
    });
  });
});

describe("domain/schedulingRules (pure, no DB)", () => {
  it("prioritizes leave over everything", () => {
    const r = determineDailySchedule(input({ leaveOnDate: { type: "Vacaciones" } }));
    expect(r.isWorkDay).toBe(false);
    expect(r.planningStatus).toBe("Vacaciones");
    expect(r.justificationType).toBe("Vacaciones");
    expect(
      determineDailySchedule(input({ leaveOnDate: { type: "Licencia Médica" } })).planningStatus,
    ).toBe("LicenciaMedica");
    expect(
      determineDailySchedule(input({ leaveOnDate: { type: "Permiso X" } })).planningStatus,
    ).toBe("PermisoEspecial");
  });

  it("handles missing assignment with and without holiday", () => {
    const noAssign = input({ activeAssignment: undefined });
    expect(determineDailySchedule(noAssign).planningStatus).toBe("SinTurnoAsignado");
    const h = determineDailySchedule({
      ...noAssign,
      holidayOnDate: { name: "Fiestas Patrias" },
    });
    expect(h.isHoliday).toBe(true);
    expect(h.planningStatus).toBe("Feriado");
  });

  it("marks out-of-vigencia targets before assignment start", () => {
    const r = determineDailySchedule(input({ targetDate: "2026-02-20" }));
    expect(r.scheduleText).toBe("Fuera de Vigencia");
    expect(r.isWorkDay).toBe(false);
  });

  it("resolves workday, off day and cycle wrap", () => {
    const work = determineDailySchedule(input({ targetDate: "2026-03-02" }));
    expect(work.isWorkDay).toBe(true);
    expect(work.planningStatus).toBe("Programado");
    expect(work.startTime).toBe("08:00");
    expect(work.endTime).toBe("16:00");
    expect(work.hours).toBe(8);
    expect(work.shiftPatternId).toBe("p1");
    expect(work.shiftPatternName).toBe("Standard 6x1");
    expect(work.patternColor).toBe("#FFFF00");
    expect(work.hasColacion).toBe(true);
    expect(work.colacionMinutes).toBe(60);

    const off = determineDailySchedule(input({ targetDate: "2026-03-07" }));
    expect(off.planningStatus).toBe("DiaLibre");
    // 2026-03-09 is 8 days after start -> wraps to dayIndex 1 (workday)
    const wrap = determineDailySchedule(input({ targetDate: "2026-03-09" }));
    expect(wrap.isWorkDay).toBe(true);
  });

  it("handles missing daySchedule gracefully", () => {
    // Missing daySchedule index 1
    const p1Incomplete = pattern7x1();
    p1Incomplete.dailySchedules = p1Incomplete.dailySchedules.filter((d) => d.dayIndex !== 1);

    const missingDay = determineDailySchedule(
      input({
        targetDate: "2026-03-02", // Maps to dayIndex 1
        activeAssignment: {
          startDate: "2026-03-01",
          shiftPattern: p1Incomplete,
        },
      }),
    );

    expect(missingDay.isWorkDay).toBe(false);
    expect(missingDay.scheduleText).toBe("Día Libre");
    expect(missingDay.planningStatus).toBe("DiaLibre");
    expect(missingDay.patternColor).toBe("#FFFF00");
  });

  it("lets holiday win unless the pattern works holidays", () => {
    const base = input({ holidayOnDate: { name: "Navidad" } });
    expect(determineDailySchedule(base).planningStatus).toBe("Feriado");
    const works = input({
      holidayOnDate: { name: "Navidad" },
      activeAssignment: {
        startDate: "2026-03-01",
        shiftPattern: { ...pattern7x1(), worksOnHolidays: true },
      },
    });
    const r = determineDailySchedule(works);
    expect(r.isWorkDay).toBe(true);
    expect(r.isHoliday).toBe(true);
  });
});
