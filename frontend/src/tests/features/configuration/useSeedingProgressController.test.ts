import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useSeedingProgressController } from "../../../features/configuration/hooks/useSeedingProgressController";
import type { UseSeedingProgressControllerOptions } from "../../../features/configuration/hooks/useSeedingProgressController";
import type { SeedPhase2Job } from "../../../services/seedingService";

const { getHealthMock, getDBInstanceMock, clearMock } = vi.hoisted(() => ({
  getHealthMock: vi.fn(),
  getDBInstanceMock: vi.fn(),
  clearMock: vi.fn(),
}));

// El probe de salud es observabilidad: se mockea con una promesa eterna para
// que ningun update de estado async compita con el cronometro del test.
vi.mock("../../../services/healthService", () => ({
  healthService: {
    getHealth: (...args: unknown[]) => getHealthMock(...args),
  },
}));

// `handleReload` limpia IndexedDB a traves de `getDBInstance` (re-export de
// `initDB`): se mockea con un DB falso de un solo store.
vi.mock("../../../utils/indexedDB", () => ({
  getDBInstance: (...args: unknown[]) => getDBInstanceMock(...args),
}));

/** Job de fase 2 con defaults neutros; cada test sobrescribe lo que usa. */
const makeJob = (overrides: Partial<SeedPhase2Job> = {}): SeedPhase2Job => ({
  id: "job-1",
  status: "running",
  config: { days: 90, leaveRatio: 5, correctionRequestRatio: 3 },
  progress: { currentDay: 1, totalDays: 90, processedRecords: 0, sealedRecords: 0, errors: 0 },
  ...overrides,
});

/** Props por defecto del controller con overrides por test. */
const baseOptions = (
  overrides: Partial<UseSeedingProgressControllerOptions> = {},
): UseSeedingProgressControllerOptions => ({
  isOpen: true,
  isFinished: false,
  error: null,
  job: null,
  jobLogs: [],
  progressSteps: ["Paso 1"],
  ...overrides,
});

/**
 * Spec 036 T10b (extension al modal de progreso): el refactor container/view
 * extrae todo el estado del modal a `useSeedingProgressController`.
 *
 * Lo que fija esta suite es lo que la extraccion puede romper en silencio:
 *
 * 1. **Derived state de fases**: `isPhase2Active` con cualquier job no
 *    detenido (incluido `pending` = fase 2 en cola),
 *    `effectiveIsFinished`/`effectiveError` segun fase y
 *    `isPhase1DonePhase2Pending` solo cuando la fase 1 termino y no hay
 *    job activo.
 * 2. **El cronometro**: reinicia al abrir, avanza por segundo mientras
 *    corre, se detiene al finalizar y no deja intervalos vivos al
 *    desmontar.
 * 3. **Los logs visibles**: los del job cuando fase 2 activa, los steps de
 *    fase 1 en el resto.
 * 4. **El porcentaje**: dia actual entre total de dias.
 * 5. **`handleReload`**: limpia IndexedDB, localStorage y sessionStorage y
 *    navega a "/".
 */
describe("useSeedingProgressController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getHealthMock.mockImplementation(() => new Promise(() => undefined));
    getDBInstanceMock.mockResolvedValue({
      objectStoreNames: ["store1"],
      clear: clearMock,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("derived state de fases", () => {
    it("con job running, fase 2 activa y no terminada", () => {
      const { result } = renderHook(() =>
        useSeedingProgressController(baseOptions({ job: makeJob() })),
      );

      expect(result.current.isPhase2Active).toBe(true);
      expect(result.current.effectiveIsFinished).toBe(false);
      expect(result.current.effectiveError).toBeNull();
      expect(result.current.isPhase1DonePhase2Pending).toBe(false);
    });

    it("con job stopped, fase 2 inactiva (fase 1)", () => {
      const { result: stopped } = renderHook(() =>
        useSeedingProgressController(
          baseOptions({ isFinished: true, job: makeJob({ status: "stopped" }) }),
        ),
      );

      expect(stopped.current.isPhase2Active).toBe(false);
      expect(stopped.current.isPhase1DonePhase2Pending).toBe(true);
    });

    it("con job pending, fase 2 activa (en cola del worker)", () => {
      const { result } = renderHook(() =>
        useSeedingProgressController(baseOptions({ job: makeJob({ status: "pending" }) })),
      );

      expect(result.current.isPhase2Active).toBe(true);
      expect(result.current.isPhase1DonePhase2Pending).toBe(false);
      expect(result.current.effectiveIsFinished).toBe(false);
    });

    it("con job completed o failed, final efectivo con el resumen del job", () => {
      const { result: completed } = renderHook(() =>
        useSeedingProgressController(baseOptions({ job: makeJob({ status: "completed" }) })),
      );
      const { result: failed } = renderHook(() =>
        useSeedingProgressController(
          baseOptions({ job: makeJob({ status: "failed", errorSummary: "Fallo de siembra" }) }),
        ),
      );

      expect(completed.current.effectiveIsFinished).toBe(true);
      expect(failed.current.effectiveIsFinished).toBe(true);
      expect(failed.current.effectiveError).toBe("Fallo de siembra");
    });

    it("sin job con isFinished, fase 1 terminada y fase 2 pendiente de inicio", () => {
      const { result } = renderHook(() =>
        useSeedingProgressController(baseOptions({ isFinished: true })),
      );

      expect(result.current.isPhase2Active).toBe(false);
      expect(result.current.effectiveIsFinished).toBe(true);
      expect(result.current.isPhase1DonePhase2Pending).toBe(true);
    });

    it("con job activo e isFinished de fase 1, la fase 2 pendiente es falsa", () => {
      const { result } = renderHook(() =>
        useSeedingProgressController(baseOptions({ isFinished: true, job: makeJob() })),
      );

      expect(result.current.isPhase1DonePhase2Pending).toBe(false);
    });

    it("sin terminar la fase 1 y sin job, nada es final ni pendiente", () => {
      const { result } = renderHook(() => useSeedingProgressController(baseOptions()));

      expect(result.current.effectiveIsFinished).toBe(false);
      expect(result.current.isPhase1DonePhase2Pending).toBe(false);
    });

    it("sin job activo, el error efectivo es el de fase 1", () => {
      const { result } = renderHook(() =>
        useSeedingProgressController(
          baseOptions({ isFinished: true, error: "Error de fase 1", job: null }),
        ),
      );

      expect(result.current.effectiveError).toBe("Error de fase 1");
    });
  });

  describe("cronometro", () => {
    it("avanza por segundo mientras el modal esta abierto y no ha terminado", async () => {
      const { result } = renderHook(() => useSeedingProgressController(baseOptions()));

      // `seconds` es interno: se verifica via la etiqueta `m:ss`.
      expect(result.current.elapsedLabel).toBe("0:00");

      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
      expect(result.current.elapsedLabel).toBe("0:03");
    });

    it("se reinicia al reabrir el modal", async () => {
      const { result, rerender } = renderHook(
        ({ isOpen }: { isOpen: boolean }) => useSeedingProgressController(baseOptions({ isOpen })),
        { initialProps: { isOpen: true } },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      expect(result.current.elapsedLabel).toBe("0:02");

      act(() => {
        rerender({ isOpen: false });
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      expect(result.current.elapsedLabel).toBe("0:02");

      act(() => {
        rerender({ isOpen: true });
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(result.current.elapsedLabel).toBe("0:01");
    });

    it("se detiene cuando el final efectivo llega", async () => {
      const { result, rerender } = renderHook(
        ({ isFinished }: { isFinished: boolean }) =>
          useSeedingProgressController(baseOptions({ isFinished })),
        { initialProps: { isFinished: false } },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      expect(result.current.elapsedLabel).toBe("0:02");

      act(() => {
        rerender({ isFinished: true });
      });
      expect(result.current.effectiveIsFinished).toBe(true);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      expect(result.current.elapsedLabel).toBe("0:02");
    });

    it("no deja intervalos vivos al desmontar", () => {
      const { unmount } = renderHook(() => useSeedingProgressController(baseOptions()));
      // El cronometro y el probe de salud suman 2 intervalos mientras corre.
      expect(vi.getTimerCount()).toBe(2);

      unmount();

      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe("displayedLogs", () => {
    it("usa los logs del job cuando hay fase 2 activa con logs", () => {
      const { result } = renderHook(() =>
        useSeedingProgressController(
          baseOptions({ job: makeJob(), jobLogs: ["Log fase 2 A", "Log fase 2 B"] }),
        ),
      );

      expect(result.current.displayedLogs).toEqual(["Log fase 2 A", "Log fase 2 B"]);
    });

    it("cae a los steps de fase 1 cuando no hay job activo", () => {
      const { result } = renderHook(() =>
        useSeedingProgressController(
          baseOptions({ job: null, progressSteps: ["Paso A", "Paso B"] }),
        ),
      );

      expect(result.current.displayedLogs).toEqual(["Paso A", "Paso B"]);
    });

    it("cae a los steps cuando el job activo no tiene logs", () => {
      const { result } = renderHook(() =>
        useSeedingProgressController(
          baseOptions({
            job: makeJob(),
            jobLogs: [],
            progressSteps: ["Paso A"],
          }),
        ),
      );

      expect(result.current.displayedLogs).toEqual(["Paso A"]);
    });
  });

  describe("currentPercent", () => {
    it("redondea dia actual entre total de dias", () => {
      const { result } = renderHook(() =>
        useSeedingProgressController(
          baseOptions({
            job: makeJob({
              progress: {
                currentDay: 45,
                totalDays: 90,
                processedRecords: 0,
                sealedRecords: 0,
                errors: 0,
              },
            }),
          }),
        ),
      );

      expect(result.current.currentPercent).toBe(50);
    });

    it("es 0 sin job", () => {
      const { result } = renderHook(() => useSeedingProgressController(baseOptions()));

      expect(result.current.currentPercent).toBe(0);
    });
  });

  describe("handleReload", () => {
    beforeEach(() => {
      localStorage.setItem("lastSyncTime", "2026-11-27T00:00:00.000Z");
      sessionStorage.setItem("otra-clave", "valor");
      // jsdom no deja redefinir `window.location`, pero `vi.stubGlobal` si
      // puede sustituir la referencia global que lee el controller.
      vi.stubGlobal("location", { href: "http://localhost/" });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("limpia IndexedDB, storage y navega a la raiz", async () => {
      const { result } = renderHook(() => useSeedingProgressController(baseOptions()));

      await act(async () => {
        await result.current.handleReload();
      });

      expect(clearMock).toHaveBeenCalledWith("store1");
      expect(localStorage.getItem("lastSyncTime")).toBeNull();
      expect(sessionStorage.length).toBe(0);
      expect(window.location.href).toBe("/");
    });

    it("no interrumpe la recarga si IndexedDB falla", async () => {
      getDBInstanceMock.mockRejectedValueOnce(new Error("IndexedDB corrupta"));

      const { result } = renderHook(() => useSeedingProgressController(baseOptions()));

      await act(async () => {
        await result.current.handleReload();
      });

      expect(localStorage.getItem("lastSyncTime")).toBeNull();
      expect(window.location.href).toBe("/");
    });
  });
});
