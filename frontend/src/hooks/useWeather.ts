import { useState, useEffect } from "react";
import { WeatherData } from "../types/index";

// TD-002 + hardening: clima real vía Open-Meteo (sin API key, uso gratuito).
// Anti-abuso (la API es gratis y no debemos saturarla):
// - Máx 1 llamada de red cada 30 min por navegador: el cache vive en
//   localStorage (sobrevive reloads y pestañas nuevas; sessionStorage se
//   perdía y cada pestaña nueva refetcheaba). Cache fresco = 0 llamadas.
// - Montajes concurrentes comparten la misma petición en vuelo (inflight).
// Ubicación: geolocalización del navegador/móvil → geolocalización por IP →
// Santiago CL por defecto. La etiqueta es la ciudad conocida más cercana.
const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";
const IP_GEO_URL = "https://ipapi.co/json/";
const CACHE_KEY = "portal-control:weather-cache";
export const WEATHER_TTL_MS = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;
const GEO_TIMEOUT_MS = 5000;

interface KnownPlace {
  name: string;
  lat: number;
  lon: number;
}

const KNOWN_PLACES: KnownPlace[] = [
  { name: "Santiago, CL", lat: -33.45, lon: -70.66 },
  { name: "Valparaíso, CL", lat: -33.04, lon: -71.63 },
  { name: "La Serena, CL", lat: -29.9, lon: -71.34 },
  { name: "Antofagasta, CL", lat: -23.65, lon: -70.4 },
  { name: "Concepción, CL", lat: -36.83, lon: -73.05 },
  { name: "Temuco, CL", lat: -38.74, lon: -72.59 },
  { name: "Puerto Montt, CL", lat: -41.47, lon: -72.94 },
  { name: "Punta Arenas, CL", lat: -53.16, lon: -70.91 },
];

const DEFAULT_PLACE = KNOWN_PLACES[0];

function mapCondition(code: number): WeatherData["condition"] {
  if (code === 0) return "Sunny";
  if (code === 1 || code === 2) return "Partly Cloudy";
  if (code === 3 || code === 45 || code === 48) return "Cloudy";
  return "Rainy";
}

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLon = rad(bLon - aLon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function nearestPlace(lat: number, lon: number): string {
  let best = DEFAULT_PLACE.name;
  let bestKm = Number.POSITIVE_INFINITY;
  for (const p of KNOWN_PLACES) {
    const km = haversineKm(lat, lon, p.lat, p.lon);
    if (km < bestKm) {
      bestKm = km;
      best = p.name;
    }
  }
  return best;
}

function buildUrl(lat: number, lon: number): string {
  return (
    `${OPEN_METEO_BASE}?latitude=${lat}&longitude=${lon}` +
    "&current=temperature_2m,weather_code,uv_index&timezone=auto&forecast_days=1"
  );
}

interface CachedWeather {
  at: number;
  weather: WeatherData;
}

function readCache(): CachedWeather | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedWeather;
    if (typeof parsed.at !== "number" || !parsed.weather) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isFresh(entry: CachedWeather): boolean {
  return Date.now() - entry.at <= WEATHER_TTL_MS;
}

function writeCache(weather: WeatherData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), weather }));
  } catch {
    // Cache best-effort (modo privado): el dato en memoria igual sirve.
  }
}

async function fetchJson(url: string, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(timer);
  }
}

interface Coords {
  lat: number;
  lon: number;
}

function validCoords(lat: unknown, lon: unknown): Coords | null {
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

function getBrowserCoords(): Promise<Coords | null> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator))
    return Promise.resolve(null);
  const geo = navigator.geolocation;
  if (!geo) return Promise.resolve(null);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), GEO_TIMEOUT_MS);
    geo.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve(validCoords(pos.coords.latitude, pos.coords.longitude));
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      { maximumAge: WEATHER_TTL_MS, timeout: GEO_TIMEOUT_MS },
    );
  });
}

async function getIpCoords(): Promise<Coords | null> {
  try {
    const body = (await fetchJson(IP_GEO_URL, FETCH_TIMEOUT_MS)) as {
      latitude?: unknown;
      longitude?: unknown;
    };
    return validCoords(body.latitude, body.longitude);
  } catch {
    return null;
  }
}

async function resolveCoords(): Promise<Coords> {
  const browser = await getBrowserCoords();
  if (browser) return browser;
  const ip = await getIpCoords();
  if (ip) return ip;
  return { lat: DEFAULT_PLACE.lat, lon: DEFAULT_PLACE.lon };
}

// Petición compartida: N montajes concurrentes = 1 sola llamada a Open-Meteo.
let inflight: Promise<WeatherData | null> | null = null;

async function loadWeather(): Promise<WeatherData | null> {
  const { lat, lon } = await resolveCoords();
  try {
    const body = (await fetchJson(buildUrl(lat, lon), FETCH_TIMEOUT_MS)) as {
      current?: { temperature_2m?: unknown; weather_code?: unknown; uv_index?: unknown };
    };
    const temp = body.current?.temperature_2m;
    const code = body.current?.weather_code;
    const uv = body.current?.uv_index;
    if (typeof temp !== "number" || typeof code !== "number") {
      throw new Error("Open-Meteo: payload inesperado");
    }
    const next: WeatherData = {
      location: nearestPlace(lat, lon),
      temperature: temp,
      condition: mapCondition(code),
      uvIndex: typeof uv === "number" ? Math.round(uv) : 0,
    };
    writeCache(next);
    return next;
  } catch {
    // Sin red o payload roto: último dato conocido aunque esté vencido,
    // si no null (el widget muestra "Cargando..." como antes).
    return readCache()?.weather ?? null;
  }
}

function loadWeatherShared(): Promise<WeatherData | null> {
  if (!inflight) {
    inflight = loadWeather().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

export const useWeather = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const cached = readCache();
    if (cached && isFresh(cached)) {
      setWeather(cached.weather);
      setIsLoading(false);
      return;
    }

    void loadWeatherShared().then((next) => {
      if (cancelled) return;
      setWeather(next);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { weather, isLoading };
};
