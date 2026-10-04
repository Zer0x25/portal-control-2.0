import { useState, useEffect } from "react";
import { WeatherData } from "../types/index";

// TD-002: clima real vía Open-Meteo (sin API key, Santiago CL). Reemplaza el
// mock aleatorio. Sin firma: { weather, isLoading }, igual que antes.
const OPEN_METEO_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=-33.45&longitude=-70.66" +
  "&current=temperature_2m,weather_code,uv_index&timezone=America%2FSantiago&forecast_days=1";
const CACHE_KEY = "portal-control:weather-cache";
const CACHE_TTL_MS = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

function mapCondition(code: number): WeatherData["condition"] {
  if (code === 0) return "Sunny";
  if (code === 1 || code === 2) return "Partly Cloudy";
  if (code === 3 || code === 45 || code === 48) return "Cloudy";
  return "Rainy";
}

interface CachedWeather {
  at: number;
  weather: WeatherData;
}

function readCache(): WeatherData | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedWeather;
    if (Date.now() - parsed.at > CACHE_TTL_MS) return null;
    return parsed.weather;
  } catch {
    return null;
  }
}

export const useWeather = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const load = async () => {
      try {
        const res = await fetch(OPEN_METEO_URL, { signal: controller.signal });
        if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
        const body = (await res.json()) as {
          current?: { temperature_2m?: unknown; weather_code?: unknown; uv_index?: unknown };
        };
        const temp = body.current?.temperature_2m;
        const code = body.current?.weather_code;
        const uv = body.current?.uv_index;
        if (typeof temp !== "number" || typeof code !== "number") {
          throw new Error("Open-Meteo: payload inesperado");
        }
        const next: WeatherData = {
          location: "Santiago, CL",
          temperature: temp,
          condition: mapCondition(code),
          uvIndex: typeof uv === "number" ? Math.round(uv) : 0,
        };
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), weather: next }));
        } catch {
          // Cache best-effort (modo privado): el dato en memoria igual sirve.
        }
        if (!cancelled) setWeather(next);
      } catch {
        // Sin red o payload roto: dato real reciente si existe, si no null
        // (el widget muestra "Cargando..." como antes con weather null).
        if (!cancelled) setWeather(readCache());
      } finally {
        clearTimeout(timer);
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return { weather, isLoading };
};
