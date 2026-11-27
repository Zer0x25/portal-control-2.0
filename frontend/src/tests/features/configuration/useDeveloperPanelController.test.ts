import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useDeveloperPanelController } from "../../../features/configuration/hooks/useDeveloperPanelController";
import type { SeedPhase2Job } from "../../../services/seedingService";

const {
  addToastMock,
  seedPhase1Mock,
  startSeedPhase2Mock,
  getSeedPhase2StatusMock,
  getSeedPhase2LogsMock,
  invalidateQueriesMock,
  connectMock,
} = vi.hoisted(() => ({
  addToastMock: vi.fn(),
  seedPhase1Mock: vi.fn(),
  startSeedPhase2Mock: vi.fn(),
  getSeedPhase2StatusMock: vi.fn(),
  getSeedPhase2LogsMock: vi.fn(),
  invalidateQueriesMock: vi.fn(),
  connectMock: vi.fn(),
}));

const STORE_STATE = { addToast: addToastMock };

vi.mock("../../../store/useStore", () => ({
  useStore: (selector: (state: typeof STORE_STATE) => unknown) => selector(STORE_STATE),
}));

/** `useToasts` vive sobre el store global; se mockea directo para aislar el hook. */
vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: addToastMock }),
}));

vi.mock("react-router", () => ({
  useNavigate: () => () => undefined,
  ROUTES: {},
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
}));

vi.mock("../../../services/seedingService", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  seedPhase1: (...args: unknown[]) => seedPhase1Mock(...args),
  startSeedPhase2: (...args: unknown[]) => startSeedPhase2Mock(...args),
  pauseSeedPhase2: vi.fn(),
  resumeSeedPhase2: vi.fn(),
  stopSeedPhase2: vi.fn(),
  getSeedPhase2Status: (...args: unknown[]) => getSeedPhase2StatusMock(...args),
  getSeedPhase2Logs: (...args: unknown[]) => getSeedPhase2LogsMock(...args),
}));

vi.mock("../../../services/socketService", () => ({
  socketService: {
    connect: () => {
      connectMock();
      return {
        on: vi.fn(),
        off: vi.fn(),
      };
    },
    disconnect: vi.fn(),
  },
}));

vi.mock("../../../utils/indexedDB", () => ({
  getDBInstance: vi.fn().mockResolvedValue({
    objectStoreNames: [],
    clear: vi.fn(),
  }),
}));

vi.mock("../../../lib/queryCache", () => ({
  purgePersistedQueryCache: vi.fn().mockResolvedValue(undefined),
}));

/** Job de fase 2 con defaults; cada test sobrescribe lo que usa. */
const makeJob = (overrides: Partial<SeedPhase2Job> = {}): SeedPhase2Job => ({
  id: "job-1",
  status: "stopped",
  createdAt: new Date().toISOString(),
  config: {
    days: 180,
    leaveRatio: 5,
    correctionRequestRatio: 2,
    batchSize: 250,
  },
  progress: { currentDay: 0, totalDays: 180, processedRecords: 0, sealedRecords: 0, errors: 0 },
  ...overrides,
});

const SEED_OPTIONS = {
  employees: 10,
  days: 60,
  basePatternsCount: 2,
  leaveRatio: 4,
  correctionRequestRatio: 1,
  shiftReportsPerDay: 0,
  quickNotesCount: 5,
};

/**
 * Fixes al flujo del seeder (sesion 2026-11-27):
 *
 * 1. **Retomar tras solo fase 1**: un job `stopped` reciente se expone como
 *    `resumablePhase2Job` y `handleStartPhase2` usa la config del job
 *    cuando `seedingOptions` se perdio (tras reload).
 * 2. **Guard de doble lanzamiento**: `handleSeedData` bloquea mientras
 *    `isPhase1Running` o hay job activo, sin gastar la request.
 * 3. **Invalidacion**: el socket `seeder:phase2_completed` invalida las
 *    queries de datos que el seeder escribio.
 */
describe("useDeveloperPanelController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSeedPhase2LogsMock.mockResolvedValue({ success: true, logs: [] });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("reconexion con job stopped (retomar fase 2)", () => {
    it("expone como retomable un job stopped reciente al montar", async () => {
      getSeedPhase2StatusMock.mockResolvedValue({
        success: true,
        job: makeJob(),
      });

      const { result } = renderHook(() => useDeveloperPanelController());

      await waitFor(() => {
        expect(result.current.resumablePhase2Job).not.toBeNull();
      });
      expect(result.current.resumablePhase2Job?.id).toBe("job-1");
      // Un job stopped no abre el modal automaticamente.
      expect(result.current.isSeedingModalOpen).toBe(false);
    });

    it("ignora un job stopped antiguo (fuera de la ventana retomable)", async () => {
      getSeedPhase2StatusMock.mockResolvedValue({
        success: true,
        job: makeJob({ createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() }),
      });

      const { result } = renderHook(() => useDeveloperPanelController());

      await waitFor(() => {
        expect(getSeedPhase2StatusMock).toHaveBeenCalled();
      });
      expect(result.current.resumablePhase2Job).toBeNull();
    });

    it("handleStartPhase2 usa la config del job cuando se perdio seedingOptions", async () => {
      getSeedPhase2StatusMock.mockResolvedValue({ success: true, job: null });
      startSeedPhase2Mock.mockResolvedValue({
        success: true,
        job: makeJob({ status: "pending", id: "job-2" }),
      });
      getSeedPhase2LogsMock.mockResolvedValue({ success: true, logs: [] });

      const { result } = renderHook(() => useDeveloperPanelController());

      // Flujo real del retomo: el job stopped se reconoce al montar y el
      // operador retoma desde el panel; seedingOptions sigue null (reload).
      const stoppedJob = makeJob();
      await act(async () => {
        result.current.setPhase2Job(stoppedJob);
        result.current.setResumablePhase2Job(stoppedJob);
      });

      expect(result.current.seedingOptions).toBeNull();

      await act(async () => {
        await result.current.handleStartPhase2();
      });

      // La config del job (days 180), NO el default (days 3).
      expect(startSeedPhase2Mock).toHaveBeenCalledWith(
        expect.objectContaining({ days: 180, leaveRatio: 5, correctionRequestRatio: 2 }),
      );
    });
  });

  describe("guard de doble lanzamiento", () => {
    it("bloquea una segunda fase 1 mientras la primera corre", async () => {
      getSeedPhase2StatusMock.mockResolvedValue({ success: true, job: null });
      seedPhase1Mock.mockImplementation(
        () =>
          new Promise<{ success: boolean }>((resolve) =>
            setTimeout(() => resolve({ success: true }), 50),
          ),
      );

      const { result } = renderHook(() => useDeveloperPanelController());

      await act(async () => {
        void result.current.handleSeedData(SEED_OPTIONS);
      });

      expect(result.current.isPhase1Running).toBe(true);

      await act(async () => {
        await result.current.handleSeedData(SEED_OPTIONS);
      });

      expect(seedPhase1Mock).toHaveBeenCalledTimes(1);
      expect(addToastMock).toHaveBeenCalledWith(
        "La Fase 1 ya está corriendo. Espera a que termine.",
        "warning",
      );
    });

    it("bloquea la fase 1 si hay un job de fase 2 activo", async () => {
      getSeedPhase2StatusMock.mockResolvedValue({ success: true, job: null });
      seedPhase1Mock.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useDeveloperPanelController());

      await act(async () => {
        result.current.setPhase2Job(makeJob({ status: "running" }));
      });

      await act(async () => {
        await result.current.handleSeedData(SEED_OPTIONS);
      });

      expect(seedPhase1Mock).not.toHaveBeenCalled();
      expect(result.current.isSeedingModalOpen).toBe(true);
    });
  });

  describe("poll de fase 2 (regresion del request storm)", () => {
    it("no re-setea el job cuando el status no cambia materialmente", async () => {
      // El bug: cada respuesta del poll creaba un objeto nuevo para
      // `phase2Job`, lo que recreaba el callback, re-ejecutaba el effect y
      // disparaba otro refresh: decenas de requests por segundo.
      const job = makeJob({ status: "running" });
      getSeedPhase2StatusMock.mockResolvedValue({ success: true, job });
      getSeedPhase2LogsMock.mockResolvedValue({ success: true, logs: [] });

      const { result } = renderHook(() => useDeveloperPanelController());

      // Abre el visor con job running => shouldPoll = true.
      await act(async () => {
        result.current.setPhase2Job(job);
        result.current.setIsSeedingModalOpen(true);
      });

      // Deja correr varios "ticks" de poll: si el loop existiera, ya habria
      // decenas de llamadas; con el fix, el estado estable corta el ciclo.
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      const callsAfterWarmup = getSeedPhase2StatusMock.mock.calls.length;
      expect(callsAfterWarmup).toBeGreaterThan(0);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Sin loop: en 50ms extra no se acumulan mas que unos pocos ticks.
      const growth = getSeedPhase2StatusMock.mock.calls.length - callsAfterWarmup;
      expect(growth).toBeLessThan(10);
    });
  });
});
