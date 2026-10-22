import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useMeterReadingsFormController } from "../../features/meters/hooks/useMeterReadingsFormController";
import { useSingleMeterReadingController } from "../../features/meters/hooks/useSingleMeterReadingController";
import { recordRequests, type RequestRecorder } from "../mocks/requests";
import { setCatalogPayload } from "../mocks/catalog";
import type { MeterConfig, MeterReadingItem } from "../../types/dashboard";

/**
 * Spec 036 T9b (AC1, AC2, AC3, AC4, AC8): los **tres formularios de medidores**
 * migrados a `useAppForm`.
 *
 * Lo que se fija aqui es lo que la migracion puede romper en silencio:
 *
 * 1. **El payload** sigue siendo identico al de antes (T13): la lista de
 *    lecturas que viaja al backend (`{meterConfigId, value}` convertida por el
 *    hook, que no se ha tocado) y solo con los medidores que tienen valor.
 * 2. **Los errores** son del medidor que incumple la regla y tienen mensaje
 *    (AC2, AC3): capacidad, porcentaje, valor negativo, consumo que baja y
 *    texto que no es un numero.
 * 3. El prefijo `+` (recarga) se respeta: puede ser negativo.
 */

const METERS_PATH = "/api/meters";
const METERS_BULK_PATH = "/api/meters/bulk";
const METER_CONFIGS_PATH = "/api/configs/meter_configs";

const medidorNivel: MeterConfig = {
  id: "mc-nivel",
  name: "Tanque de agua",
  category: "water",
  type: "LEVEL",
  unit: "L",
  maxCapacity: 100,
  lastModified: 0,
  syncStatus: "synced",
  isDeleted: false,
};

const medidorConsumo: MeterConfig = {
  id: "mc-consumo",
  name: "Consumo electrico",
  category: "electricity",
  type: "CONSUMPTION",
  unit: "kWh",
  lastModified: 0,
  syncStatus: "synced",
  isDeleted: false,
};

const medidorPorcentaje: MeterConfig = {
  id: "mc-porcentaje",
  name: "Bateria",
  category: "custom",
  type: "PERCENT",
  unit: "%",
  lastModified: 0,
  syncStatus: "synced",
  isDeleted: false,
};

/** Ultima lectura registrada (los medidores de consumo no pueden bajar). */
const lecturaPrevia = (meterConfigId: string, normalizedValue: number): MeterReadingItem =>
  ({
    id: `r-${meterConfigId}`,
    meterConfigId,
    timestamp: 1,
    authorUsername: "tester",
    value: normalizedValue,
    isRecharge: false,
    normalizedValue,
    delta: 0,
    eventType: "UNKNOWN",
    syncStatus: "synced",
    lastModified: 0,
    isDeleted: false,
  }) as MeterReadingItem;

const setup = (): { wrapper: React.ComponentType<{ children: React.ReactNode }> } => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper };
};

let recorder: RequestRecorder | undefined;

const bodyOf = async (method: string, path: string): Promise<unknown> => {
  const request = recorder?.requests.find((r) => r.method === method && r.path === path);
  expect(request, `No se registro ${method} ${path}`).toBeDefined();
  const body = await request?.bodyJson();
  expect(body).toBeTypeOf("object");
  return body;
};

beforeEach(() => {
  // Las consultas de medidores exigen sesion (mismo contrato que la app).
  sessionStorage.setItem("authToken", "token-de-test");
});

afterEach(() => {
  sessionStorage.removeItem("authToken");
  recorder?.stop();
  recorder = undefined;
});

describe("useMeterReadingsFormController (spec 036 T9b)", () => {
  it("envia solo los medidores con valor y con la misma forma de antes", async () => {
    recorder = recordRequests();
    setCatalogPayload(METER_CONFIGS_PATH, [medidorNivel, medidorConsumo]);
    const { wrapper } = setup();
    const { result } = renderHook(() => useMeterReadingsFormController(), { wrapper });

    await waitFor(() => expect(result.current.meterConfigs).toHaveLength(2));

    await act(async () => {
      result.current.setValue("mc-nivel", "42");
      // Sin valor: el medidor no viaja (igual que antes de la migracion).
      result.current.setValue("mc-consumo", "");
      result.current.submit();
    });

    await waitFor(() =>
      expect(
        recorder?.requests.some((r) => r.method === "POST" && r.path === METERS_BULK_PATH),
      ).toBe(true),
    );

    const body = (await bodyOf("POST", METERS_BULK_PATH)) as Array<Record<string, unknown>>;
    expect(body).toHaveLength(1);
    expect(body[0].meterConfigId).toBe("mc-nivel");
    expect(body[0].value).toBe(42);
    expect(body[0].isRecharge).toBe(false);
    expect(body[0].authorUsername).toBe("System");
  });

  it("respeta el prefijo `+` (recarga) y su valor negativo", async () => {
    recorder = recordRequests();
    setCatalogPayload(METER_CONFIGS_PATH, [medidorNivel]);
    const { wrapper } = setup();
    const { result } = renderHook(() => useMeterReadingsFormController(), { wrapper });

    await waitFor(() => expect(result.current.meterConfigs).toHaveLength(1));

    await act(async () => {
      result.current.setValue("mc-nivel", "+5");
      result.current.submit();
    });

    await waitFor(() =>
      expect(
        recorder?.requests.some((r) => r.method === "POST" && r.path === METERS_BULK_PATH),
      ).toBe(true),
    );

    const body = (await bodyOf("POST", METERS_BULK_PATH)) as Array<Record<string, unknown>>;
    expect(body[0].value).toBe(5);
    expect(body[0].isRecharge).toBe(true);
  });

  it("bloquea el envio y avisa en el medidor cuando el valor no es un numero", async () => {
    recorder = recordRequests();
    setCatalogPayload(METER_CONFIGS_PATH, [medidorNivel]);
    const { wrapper } = setup();
    const { result } = renderHook(() => useMeterReadingsFormController(), { wrapper });

    await waitFor(() => expect(result.current.meterConfigs).toHaveLength(1));

    await act(async () => {
      result.current.setValue("mc-nivel", "no-es-un-numero");
      result.current.submit();
    });

    await waitFor(() => expect(result.current.getError("mc-nivel")).toBeDefined());
    expect(result.current.getError("mc-nivel")).toContain("número válido");
    expect(recorder?.requests.some((r) => r.method === "POST" && r.path === METERS_BULK_PATH)).toBe(
      false,
    );
  });

  it("bloquea el envio cuando el nivel supera la capacidad del medidor", async () => {
    recorder = recordRequests();
    setCatalogPayload(METER_CONFIGS_PATH, [medidorNivel]);
    const { wrapper } = setup();
    const { result } = renderHook(() => useMeterReadingsFormController(), { wrapper });

    await waitFor(() => expect(result.current.meterConfigs).toHaveLength(1));

    await act(async () => {
      result.current.setValue("mc-nivel", "150");
      result.current.submit();
    });

    await waitFor(() => expect(result.current.getError("mc-nivel")).toBeDefined());
    expect(result.current.getError("mc-nivel")).toContain("capacidad máxima");
    expect(recorder?.requests.some((r) => r.method === "POST" && r.path === METERS_BULK_PATH)).toBe(
      false,
    );
  });

  it("bloquea el envio cuando el porcentaje pasa de 100", async () => {
    recorder = recordRequests();
    setCatalogPayload(METER_CONFIGS_PATH, [medidorPorcentaje]);
    const { wrapper } = setup();
    const { result } = renderHook(() => useMeterReadingsFormController(), { wrapper });

    await waitFor(() => expect(result.current.meterConfigs).toHaveLength(1));

    await act(async () => {
      result.current.setValue("mc-porcentaje", "120");
      result.current.submit();
    });

    await waitFor(() => expect(result.current.getError("mc-porcentaje")).toBeDefined());
    expect(result.current.getError("mc-porcentaje")).toContain("porcentaje");
  });

  it("bloquea el envio cuando un medidor de consumo baja de la lectura anterior", async () => {
    recorder = recordRequests();
    setCatalogPayload(METER_CONFIGS_PATH, [medidorConsumo]);
    setCatalogPayload(METERS_PATH, { success: true, data: [lecturaPrevia("mc-consumo", 100)] });
    const { wrapper } = setup();
    const { result } = renderHook(() => useMeterReadingsFormController(), { wrapper });

    await waitFor(() => expect(result.current.meterConfigs).toHaveLength(1));
    await waitFor(() => expect(result.current.lastReadingById["mc-consumo"]).toBe(100));

    await act(async () => {
      result.current.setValue("mc-consumo", "50");
      result.current.submit();
    });

    await waitFor(() => expect(result.current.getError("mc-consumo")).toBeDefined());
    expect(result.current.getError("mc-consumo")).toContain("menor al anterior");
    expect(recorder?.requests.some((r) => r.method === "POST" && r.path === METERS_BULK_PATH)).toBe(
      false,
    );
  });

  it("bloquea el envio cuando la lectura es negativa (sin recarga)", async () => {
    recorder = recordRequests();
    setCatalogPayload(METER_CONFIGS_PATH, [medidorNivel]);
    const { wrapper } = setup();
    const { result } = renderHook(() => useMeterReadingsFormController(), { wrapper });

    await waitFor(() => expect(result.current.meterConfigs).toHaveLength(1));

    await act(async () => {
      result.current.setValue("mc-nivel", "-5");
      result.current.submit();
    });

    await waitFor(() => expect(result.current.getError("mc-nivel")).toBeDefined());
    expect(result.current.getError("mc-nivel")).toContain("negativo");
  });
});

describe("useSingleMeterReadingController (spec 036 T9b)", () => {
  it("envia la lectura del medidor con la misma forma de antes", async () => {
    recorder = recordRequests();
    setCatalogPayload(METER_CONFIGS_PATH, [medidorNivel]);
    const { wrapper } = setup();
    const { result } = renderHook(
      () => useSingleMeterReadingController({ isOpen: true, meterConfig: medidorNivel }),
      { wrapper },
    );

    await act(async () => {
      result.current.handleValueChange("42");
      result.current.submit();
    });

    await waitFor(() =>
      expect(
        recorder?.requests.some((r) => r.method === "POST" && r.path === METERS_BULK_PATH),
      ).toBe(true),
    );

    const body = (await bodyOf("POST", METERS_BULK_PATH)) as Array<Record<string, unknown>>;
    expect(body).toHaveLength(1);
    expect(body[0].meterConfigId).toBe("mc-nivel");
    expect(body[0].value).toBe(42);
    expect(body[0].isRecharge).toBe(false);
  });

  it("avisa en el campo cuando la lectura supera la capacidad", async () => {
    recorder = recordRequests();
    setCatalogPayload(METER_CONFIGS_PATH, [medidorNivel]);
    const { wrapper } = setup();
    const { result } = renderHook(
      () => useSingleMeterReadingController({ isOpen: true, meterConfig: medidorNivel }),
      { wrapper },
    );

    await act(async () => {
      result.current.handleValueChange("150");
      result.current.submit();
    });

    await waitFor(() => expect(result.current.getError("value")).toBeDefined());
    expect(result.current.getError("value")).toContain("capacidad máxima");
    expect(recorder?.requests.some((r) => r.method === "POST" && r.path === METERS_BULK_PATH)).toBe(
      false,
    );
  });

  it("avisa en el campo cuando la lectura esta vacia", async () => {
    recorder = recordRequests();
    setCatalogPayload(METER_CONFIGS_PATH, [medidorNivel]);
    const { wrapper } = setup();
    const { result } = renderHook(
      () => useSingleMeterReadingController({ isOpen: true, meterConfig: medidorNivel }),
      { wrapper },
    );

    await act(async () => {
      result.current.submit();
    });

    await waitFor(() => expect(result.current.getError("value")).toBeDefined());
    expect(result.current.getError("value")).toContain("vacío");
  });
});
