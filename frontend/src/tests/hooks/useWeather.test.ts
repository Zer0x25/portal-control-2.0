import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useWeather, WEATHER_TTL_MS } from "../../hooks/useWeather";

const CACHE_KEY = "portal-control:weather-cache";
const METEO_OK = { current: { temperature_2m: 24.3, weather_code: 0, uv_index: 7.6 } };

function mockFetchOnce(payload: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 500,
      json: async () => payload,
    }),
  );
}

function mockFetchRoute(ipPayload: unknown, meteoPayload: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes("ipapi.co")) {
        return { ok: true, status: 200, json: async () => ipPayload };
      }
      return { ok: true, status: 200, json: async () => meteoPayload };
    }),
  );
}

function stubGeolocation(latitude: number, longitude: number) {
  Object.defineProperty(globalThis.navigator, "geolocation", {
    value: {
      getCurrentPosition: (onOk: (pos: unknown) => void) => {
        onOk({ coords: { latitude, longitude } });
      },
    },
    configurable: true,
  });
}

describe("useWeather (TD-002, Open-Meteo)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(globalThis.navigator, "geolocation");
  });

  it("mapea weather_code 0 a Sunny con temperatura y UV reales", async () => {
    mockFetchOnce(METEO_OK);
    const { result } = renderHook(() => useWeather());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.weather).toMatchObject({
      location: "Santiago, CL",
      temperature: 24.3,
      condition: "Sunny",
      uvIndex: 8,
    });
  });

  it("mapea códigos de lluvia a Rainy y nublado parcial", async () => {
    mockFetchOnce({ current: { temperature_2m: 12, weather_code: 61, uv_index: 1.2 } });
    const { result } = renderHook(() => useWeather());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.weather?.condition).toBe("Rainy");
  });

  it("con cache fresco no hace ninguna llamada de red", async () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        at: Date.now(),
        weather: { location: "Santiago, CL", temperature: 20, condition: "Cloudy", uvIndex: 3 },
      }),
    );
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useWeather());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.weather?.temperature).toBe(20);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("con cache vencido refetchea y actualiza", async () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        at: Date.now() - WEATHER_TTL_MS - 1000,
        weather: { location: "Santiago, CL", temperature: 20, condition: "Cloudy", uvIndex: 3 },
      }),
    );
    mockFetchOnce(METEO_OK);
    const { result } = renderHook(() => useWeather());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.weather?.temperature).toBe(24.3);
  });

  it("ante fallo de red usa el último dato conocido aunque esté vencido", async () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        at: Date.now() - WEATHER_TTL_MS - 1000,
        weather: { location: "Santiago, CL", temperature: 20, condition: "Cloudy", uvIndex: 3 },
      }),
    );
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { result } = renderHook(() => useWeather());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.weather?.temperature).toBe(20);
  });

  it("ante fallo sin cache devuelve null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { result } = renderHook(() => useWeather());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.weather).toBeNull();
  });

  it("usa la geolocalización del navegador y etiqueta la ciudad más cercana", async () => {
    stubGeolocation(-33.0, -71.6); // Valparaíso
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => METEO_OK,
    });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useWeather());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("latitude=-33");
    expect(result.current.weather?.location).toBe("Valparaíso, CL");
  });

  it("sin geolocalización usa la IP y etiqueta la ciudad más cercana", async () => {
    mockFetchRoute({ latitude: -36.83, longitude: -73.05 }, METEO_OK); // Concepción
    const { result } = renderHook(() => useWeather());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.weather?.location).toBe("Concepción, CL");
  });

  it("montajes concurrentes comparten una sola llamada a Open-Meteo", async () => {
    mockFetchRoute({ latitude: -33.45, longitude: -70.66 }, METEO_OK);
    const fetchMock = vi.mocked(globalThis.fetch);
    const a = renderHook(() => useWeather());
    const b = renderHook(() => useWeather());
    await waitFor(() => expect(a.result.current.isLoading).toBe(false));
    await waitFor(() => expect(b.result.current.isLoading).toBe(false));
    const meteoCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes("api.open-meteo.com"),
    );
    expect(meteoCalls).toHaveLength(1);
    expect(a.result.current.weather).toEqual(b.result.current.weather);
  });
});
