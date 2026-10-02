export type PunchAction = "ENTRADA" | "INICIO_COLACION" | "FIN_COLACION" | "SALIDA";
export type PunchStatus = "Laborando" | "Colacion" | "Completado" | "AnomaliaManual";

export interface PunchState {
  entrada?: string | null;
  inicioColacion?: string | null;
  finColacion?: string | null;
  salida?: string | null;
  status: string;
}

export interface PunchTransition {
  action: PunchAction;
  nextStatus: PunchStatus;
  updateField: keyof PunchState;
}

const BREAK_EXIT_TIMEOUT_MS = 60 * 60 * 1000;

/**
 * PURE DOMAIN LOGIC: Determines the next logical step in a punch cycle.
 */
export function determineNextPunchAction(
  currentState: PunchState,
  forcedType?: string,
): PunchTransition {
  // 1. Forced overrides (Manual selection in UI)
  if (forcedType === "entrada") {
    if (currentState.entrada) throw new Error("ALREADY_PUNCHED_IN");
    return {
      action: "ENTRADA",
      nextStatus: "Laborando",
      updateField: "entrada",
    };
  }
  if (forcedType === "inicio_colacion") {
    if (currentState.inicioColacion) throw new Error("ALREADY_BREAK_STARTED");
    return {
      action: "INICIO_COLACION",
      nextStatus: "Colacion",
      updateField: "inicioColacion",
    };
  }
  if (forcedType === "fin_colacion") {
    if (!currentState.inicioColacion) throw new Error("NO_BREAK_STARTED");
    if (currentState.finColacion) throw new Error("ALREADY_BREAK_FINISHED");
    return {
      action: "FIN_COLACION",
      nextStatus: "Laborando",
      updateField: "finColacion",
    };
  }
  if (forcedType === "salida") {
    if (currentState.salida) throw new Error("ALREADY_PUNCHED_OUT");
    return {
      action: "SALIDA",
      nextStatus: "Completado",
      updateField: "salida",
    };
  }

  // 2. Automated Flow (Kiosk / One-button flow)
  if (!currentState.entrada) {
    return {
      action: "ENTRADA",
      nextStatus: "Laborando",
      updateField: "entrada",
    };
  }

  if (!currentState.inicioColacion) {
    return {
      action: "INICIO_COLACION",
      nextStatus: "Colacion",
      updateField: "inicioColacion",
    };
  }

  if (!currentState.finColacion) {
    return {
      action: "FIN_COLACION",
      nextStatus: "Laborando",
      updateField: "finColacion",
    };
  }

  if (!currentState.salida) {
    return {
      action: "SALIDA",
      nextStatus: "Completado",
      updateField: "salida",
    };
  }

  throw new Error("WORKDAY_FINISHED");
}

/**
 * PURE DOMAIN LOGIC: Validates if a record is logically "closed" or needs auto-closure.
 */
export function shouldAutoClose(record: PunchState, thresholdHours: number = 14): boolean {
  if (record.status === "Completado" || record.status === "AnomaliaManual") return false;
  if (!record.entrada) return false;

  const entradaTime = new Date(record.entrada).getTime();
  const now = Date.now();
  const elapsedHours = (now - entradaTime) / (1000 * 60 * 60);

  return elapsedHours >= thresholdHours;
}

/**
 * Determines whether exit can be allowed when break is incomplete.
 * Rule is strict: elapsed break must be > 60 minutes.
 */
export function canExitWithIncompleteBreak(
  inicioColacion: string | null | undefined,
  finColacion: string | null | undefined,
  now: Date = new Date(),
): { allowed: boolean; elapsedBreakMinutes: number } {
  if (!inicioColacion || finColacion) return { allowed: false, elapsedBreakMinutes: 0 };

  const breakStartMs = new Date(inicioColacion).getTime();
  if (!Number.isFinite(breakStartMs)) return { allowed: false, elapsedBreakMinutes: 0 };

  const elapsedBreakMs = now.getTime() - breakStartMs;
  const elapsedBreakMinutes = Math.floor(elapsedBreakMs / (1000 * 60));

  return {
    allowed: elapsedBreakMs > BREAK_EXIT_TIMEOUT_MS,
    elapsedBreakMinutes,
  };
}
