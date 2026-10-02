type IntegrityStatus = "ok" | "degraded";

type IntegrityRunSnapshot = {
  status: IntegrityStatus;
  lastRunAt: string | null;
  lastCheckedCount: number;
  lastBrokenCount: number;
  bulkModeLastRun: boolean;
  lastBrokenByReason: {
    missingHash: number;
    hashMismatch: number;
    prevHashMismatch: number;
  };
  lastBackfillAt: string | null;
  lastBackfillProcessed: number;
  lastBackfillErrors: number;
  bulkAlert: {
    lastSignature: string | null;
    lastAlertAt: string | null;
    suppressedCount: number;
  };
};

const state: IntegrityRunSnapshot = {
  status: "ok",
  lastRunAt: null,
  lastCheckedCount: 0,
  lastBrokenCount: 0,
  bulkModeLastRun: false,
  lastBrokenByReason: {
    missingHash: 0,
    hashMismatch: 0,
    prevHashMismatch: 0,
  },
  lastBackfillAt: null,
  lastBackfillProcessed: 0,
  lastBackfillErrors: 0,
  bulkAlert: {
    lastSignature: null,
    lastAlertAt: null,
    suppressedCount: 0,
  },
};

export const integrityStatusService = {
  markVerifyRun(input: {
    checkedCount: number;
    brokenCount: number;
    bulkMode: boolean;
    byReason: { missingHash: number; hashMismatch: number; prevHashMismatch: number };
  }) {
    state.lastRunAt = new Date().toISOString();
    state.lastCheckedCount = input.checkedCount;
    state.lastBrokenCount = input.brokenCount;
    state.bulkModeLastRun = input.bulkMode;
    state.lastBrokenByReason = input.byReason;
    state.status = input.brokenCount > 0 ? "degraded" : "ok";
  },

  markBackfillRun(input: { processed: number; errors: number }) {
    state.lastBackfillAt = new Date().toISOString();
    state.lastBackfillProcessed = input.processed;
    state.lastBackfillErrors = input.errors;
  },

  shouldEmitBulkAlert(signature: string, cooldownMinutes: number): boolean {
    const now = Date.now();
    const lastSignature = state.bulkAlert.lastSignature;
    const lastAt = state.bulkAlert.lastAlertAt
      ? new Date(state.bulkAlert.lastAlertAt).getTime()
      : 0;
    const cooldownMs = Math.max(cooldownMinutes, 1) * 60 * 1000;

    if (lastSignature === signature && now - lastAt < cooldownMs) {
      state.bulkAlert.suppressedCount += 1;
      return false;
    }

    state.bulkAlert.lastSignature = signature;
    state.bulkAlert.lastAlertAt = new Date(now).toISOString();
    return true;
  },

  getSnapshot(): IntegrityRunSnapshot {
    return {
      ...state,
      lastBrokenByReason: { ...state.lastBrokenByReason },
      bulkAlert: { ...state.bulkAlert },
    };
  },
};
