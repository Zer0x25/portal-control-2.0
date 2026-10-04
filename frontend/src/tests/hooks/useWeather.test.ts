import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useWeather } from "../../hooks/useWeather";

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

describe("useWeather (TD-002, Open-Meteo)", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("mapea weather_code 0 a Sunny con temperatura y UV reales", async () => {
    mockFetchOnce({ current: { temperature_2m: 24.3, weather_code: 0, uv_index: 7.6 } });
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

  it("ante fallo de red usa el cache reciente", async () => {
    sessionStorage.setItem(
      "portal-control:weather-cache",
      JSON.stringify({
        at: Date.now(),
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
});
