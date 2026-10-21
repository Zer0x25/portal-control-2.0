import { paths, components } from "../types/api";
import { authTokenStore } from "./authToken";
import { API_BASE_URL } from "./apiBase";

/**
 * **Contrato del cliente HTTP único** del frontend (spec 034, ADR-0024).
 *
 * Este módulo es el **único** que habla HTTP con el backend. El guardrail
 * `src/tests/guardrails/httpClientGuardrails.test.ts` bloquea `fetch(`,
 * `XMLHttpRequest` y `axios` fuera de él (y de una whitelist congelada de 3
 * entradas: este fichero, la API externa de Open-Meteo y un asset estático).
 *
 * - `ApiHttpError` preserva el `status` numérico, para que el clasificador
 *   `hasHttpStatus` de TanStack Query pueda distinguir 401/403/404/409/429.
 * - Timeout por defecto de 15 s con `AbortSignal.timeout` (componible con la
 *   señal del llamante).
 * - Retry **solo GET** (red / 429 / 5xx), con respeto de `Retry-After` y
 *   backoff exponencial.
 * - Dedup de GET en vuelo para la misma URL (se desactiva si el llamante pasa
 *   su propia `signal`).
 * - **Un solo dueño del retry de transporte**: `apiClient`. TanStack Query no
 *   reintenta por su cuenta (`src/lib/queryClient.ts` -> `queries.retry:
 *   false`), asi que un GET que falla cuesta 3 peticiones HTTP, no 9.
 * - **Un solo dueño de los eventos globales de auth**: `rate_limited` se emite
 *   aqui (venia del monkey-patch de `window.fetch` de `fetchGuards.ts`, ya
 *   eliminado) y `unauthorized` se suprime en los endpoints de autenticacion
 *   anonima, para que una contrasena incorrecta nunca cierre la sesion.
 * - `request<T>()` verifica el `url` contra el contrato OpenAPI: una ruta mal
 *   escrita no compila.
 * - Modos de respuesta `json | binary | stream`; cuerpo `FormData` sin
 *   `Content-Type` manual; metodo `patch`; opcion `cache` para las lecturas
 *   de estado.
 * - El token de sesion vive en `src/services/authToken.ts` (fuera de
 *   `authService`) para que este modulo y el service de autenticacion no se
 *   importen de forma circular.
 */

const DEFAULT_TIMEOUT_MS = 15000;
const MAX_GET_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 300;
const MAX_RETRY_AFTER_MS = 5000;
const RATE_LIMIT_EVENT_LOCK_MS = 5000;

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

/**
 * Endpoints de autenticación **anónima**: un 401 aquí significa "credencial
 * incorrecta", no "sesión expirada". Emitir `unauthorized` cerraría la sesión
 * del usuario (src/store/useStore.ts) en lugar de mostrar el error de credencial.
 * `/auth/mfa/setup` y `/auth/mfa/verify` **sí** exigen sesión previa: un 401
 * ahí es expiración de sesión y deben conservar el evento.
 */
const ANONYMOUS_AUTH_PATH = /\/auth\/(login|mfa\/validate|kiosk-login)(?:\?|$)/;

export class ApiHttpError extends Error {
  readonly status: number;
  readonly url: string;
  readonly data: unknown;

  constructor(message: string, status: number, url: string, data?: unknown) {
    super(message);
    this.name = "ApiHttpError";
    this.status = status;
    this.url = url;
    this.data = data;
  }
}

/**
 * Modos de respuesta del cliente.
 *
 * - `json` (por defecto): cuerpo JSON (o texto si el backend no lo dice).
 * - `binary`: `{ blob, headers, filename? }` sin pasar por `response.text()`.
 * - `stream`: devuelve la `Response` cruda para que el consumidor lea el
 *   flujo (SSE, respuestas JSON por lineas).
 */
export type ResponseType = "json" | "binary" | "stream";

/**
 * Mensaje de error utilizable por el llamante.
 *
 * `ApiHttpError` ya lleva el mensaje del backend; cuando la respuesta no
 * traia mensaje, se devuelve el texto generico del llamante en vez del
 * placeholder `API Error (status)`.
 */
export const errorMessageOr = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message && !error.message.startsWith("API Error (")) {
    return error.message;
  }
  return fallback;
};

/** Respuesta binaria (PDF/XLSX): no pasa por `response.text()`, que lo corrompe. */
export interface BinaryResponse {
  blob: Blob;
  headers: Headers;
  /** Nombre de archivo derivado de `Content-Disposition`, si el servidor lo envía. */
  filename?: string;
}

/** Resultado tipado para los endpoints donde un 4xx es un caso de negocio. */
export interface RequestResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: ApiHttpError;
}

/** Inflight GET dedup: same method+URL+auth shares one network promise. */
const inflightGets = new Map<string, Promise<unknown>>();

/** Lock anti-tormenta del evento `rate_limited` (5 s, como en `fetchGuards.ts`). */
let rateLimitEventLocked = false;

/** Solo para tests: olvida el lock del evento `rate_limited`. */
export const resetRateLimitEventLockForTests = (): void => {
  rateLimitEventLocked = false;
};

function getAuthHeaderString(): string {
  try {
    const headers = authTokenStore.getAuthHeader() as Record<string, string>;
    return headers["Authorization"] ?? "";
  } catch {
    return "";
  }
}

function buildTimeoutSignal(timeoutMs: number, userSignal?: AbortSignal): AbortSignal {
  const timeoutSignal =
    typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(timeoutMs)
      : (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), timeoutMs);
          return controller.signal;
        })();

  if (!userSignal) return timeoutSignal;
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([userSignal, timeoutSignal]);
  }
  return userSignal.aborted || timeoutSignal.aborted ? AbortSignal.abort() : timeoutSignal;
}

function getRetryAfterMs(response: Response): number | null {
  const raw = response.headers.get("Retry-After");
  if (!raw) return null;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) {
    return Math.min(Math.max(seconds * 1000, 0), MAX_RETRY_AFTER_MS);
  }
  const dateMs = Date.parse(raw);
  if (!Number.isNaN(dateMs)) {
    return Math.min(Math.max(dateMs - Date.now(), 0), MAX_RETRY_AFTER_MS);
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNetworkError(error: unknown): boolean {
  return (
    error instanceof DOMException ||
    (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError"))
  );
}

/**
 * Nombre de archivo de un `Content-Disposition`.
 * Soporta la forma extendida (`filename*=UTF-8''...`) y la simple.
 */
export function parseContentDispositionFilename(header: string | null): string | undefined {
  if (!header) return undefined;
  const extended = header.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (extended?.[1]) {
    try {
      return decodeURIComponent(extended[1].trim());
    } catch {
      return extended[1].trim();
    }
  }
  const plain = header.match(/filename\s*=\s*"?([^";]+)"?/i);
  return plain?.[1]?.trim() || undefined;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
  /**
   * Suprime los eventos globales `unauthorized` y `rate_limited`.
   * Por defecto `false`, pero se aplica **automáticamente** a los endpoints de
   * autenticación anónima (`/auth/login`, `/auth/mfa/validate`,
   * `/auth/kiosk-login`).
   */
  skipAuthEvents?: boolean;
  /** `binary` devuelve `{ blob, headers, filename? }` sin pasar por `text()`. */
  /** `stream` devuelve la `Response` cruda (flujo de progreso). */
  responseType?: ResponseType;
}

export interface GetOptions extends RequestOptions {
  params?: Record<string, unknown>;
  path?: Record<string, string | number>;
  retry?: boolean;
  dedup?: boolean;
}

type Path = keyof paths;
export type Schema<T extends keyof components["schemas"]> = components["schemas"][T];

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Contrato del helper `request<T>()`: una llamada HTTP tipada. */
export interface RequestSpec {
  method: HttpMethod;
  /** Ruta de la API (con o sin `/api` inicial; se normaliza). */
  url: string;
  body?: unknown;
  params?: Record<string, unknown>;
  path?: Record<string, string | number>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
  responseType?: ResponseType;
  /** Cache HTTP del navegador (`no-store` para consultas de estado). */
  cache?: RequestCache;
  /**
   * `throw` (por defecto): lanza `ApiHttpError`.
   * `result`: devuelve `{ ok, status, data?, error? }` sin lanzar, para los
   * endpoints donde un 404 es un caso de negocio legítimo.
   */
  errorMode?: "throw" | "result";
  /** Solo GET: reintentos de transporte. */
  retry?: boolean;
  /** Solo GET: dedup de peticiones en vuelo. */
  dedup?: boolean;
  skipAuthEvents?: boolean;
}

/**
 * Normalizes the URL to prevent double /api prefix if API_BASE_URL ends with /api
 * and the path also starts with /api.
 */
function getFullUrl(path: string): string {
  const base = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // If base ends with /api and path starts with /api, remove one /api
  if (base.endsWith("/api") && normalizedPath.startsWith("/api/")) {
    return `${base}${normalizedPath.substring(4)}`;
  }

  return `${base}${normalizedPath}`;
}

interface PreparedRequest {
  method: HttpMethod;
  /** Ruta normalizada sin query (para detectar endpoints anónimos). */
  path: string;
  fullUrl: string;
  headers: Record<string, string>;
  body?: BodyInit;
  signal?: AbortSignal;
  timeoutMs: number;
  retry: boolean;
  dedup: boolean;
  skipAuthEvents: boolean;
  responseType: ResponseType;
  cache?: RequestCache;
}

function prepareRequest(spec: RequestSpec): PreparedRequest {
  const resolvedPath = resolvePath(spec.url, spec.path);
  const fullUrl = `${getFullUrl(resolvedPath)}${buildQuery(spec.params)}`;
  const isGet = spec.method === "GET";
  const { body, headers } = prepareBody(spec.body, {
    ...(authTokenStore.getAuthHeader() as Record<string, string>),
    ...spec.headers,
  });

  return {
    method: spec.method,
    path: resolvedPath,
    fullUrl,
    headers,
    body,
    signal: spec.signal,
    timeoutMs: spec.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    retry: isGet ? (spec.retry ?? true) : false,
    dedup: isGet ? (spec.dedup ?? true) && !spec.signal : false,
    skipAuthEvents: spec.skipAuthEvents ?? ANONYMOUS_AUTH_PATH.test(resolvedPath),
    responseType: spec.responseType ?? "json",
    cache: spec.cache,
  };
}

/**
 * Prepara el cuerpo de la petición.
 * Un `FormData` **no** lleva `Content-Type` manual: el navegador tiene que
 * fijar el `boundary` de `multipart/form-data` (forzarlo rompe el upload).
 */
function prepareBody(
  body: unknown,
  headers: Record<string, string>,
): { body?: BodyInit; headers: Record<string, string> } {
  if (body === undefined) return { headers };
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    const next = { ...headers };
    delete next["Content-Type"];
    delete next["content-type"];
    return { body, headers: next };
  }
  return {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
  };
}

/** Emite los eventos globales de auth: `unauthorized` (401) y `rate_limited` (429). */
function emitAuthEvents(response: Response, prepared: PreparedRequest): void {
  if (prepared.skipAuthEvents) return;
  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent("unauthorized"));
  }
  if (response.status === 429) {
    emitRateLimited(response, prepared.fullUrl);
  }
}

/**
 * Evento `rate_limited` (antes en `fetchGuards.ts`).
 * El lock de 5 s evita tormentas de eventos; el retry de 429 respeta
 * `Retry-After` sin volver a emitir el evento.
 */
function emitRateLimited(response: Response, url: string): void {
  if (rateLimitEventLocked) return;
  rateLimitEventLocked = true;

  const detail = {
    status: response.status,
    url,
    retryAfter: response.headers.get("Retry-After"),
  };

  window.dispatchEvent(new CustomEvent("rate_limited", { detail }));

  setTimeout(() => {
    rateLimitEventLocked = false;
  }, RATE_LIMIT_EVENT_LOCK_MS);
}

/** Ejecuta la petición con el retry de transporte (solo GET). */
async function performRequest(prepared: PreparedRequest): Promise<Response> {
  const maxAttempts = prepared.retry ? MAX_GET_RETRIES + 1 : 1;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(prepared.fullUrl, {
        method: prepared.method,
        headers: prepared.headers,
        body: prepared.body,
        signal: buildTimeoutSignal(prepared.timeoutMs, prepared.signal),
        cache: prepared.cache,
      });

      emitAuthEvents(response, prepared);

      if (response.ok) return response;

      if (prepared.retry && RETRYABLE_STATUSES.has(response.status) && attempt < maxAttempts - 1) {
        const retryAfter = getRetryAfterMs(response);
        await response.body?.cancel().catch(() => undefined);
        await sleep(retryAfter ?? RETRY_BASE_DELAY_MS * (attempt + 1));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
      if (prepared.signal?.aborted) throw error;
      if (prepared.retry && isNetworkError(error) && attempt < maxAttempts - 1) {
        await sleep(RETRY_BASE_DELAY_MS * (attempt + 1));
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

/** Convierte una respuesta de error en `ApiHttpError` (status numérico). */
async function toApiHttpError(response: Response, url: string): Promise<ApiHttpError> {
  const errorData = await response.json().catch(() => ({ message: "API Error" }));
  const message =
    (errorData as { message?: string }).message ??
    (errorData as { error?: string }).error ??
    `API Error (${response.status})`;
  return new ApiHttpError(message, response.status, url, errorData);
}

/** Lee el cuerpo de la respuesta según el modo (JSON o binario). */
async function readBody(response: Response, prepared: PreparedRequest): Promise<unknown> {
  if (response.status === 204) return undefined;

  if (prepared.responseType === "stream") {
    // El consumidor lee el flujo: el cuerpo no se consume aqui.
    return response;
  }

  if (prepared.responseType === "binary") {
    const blob = await response.blob();
    return {
      blob,
      headers: response.headers,
      filename: parseContentDispositionFilename(response.headers.get("content-disposition")),
    } satisfies BinaryResponse;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await response.text().catch(() => "");
    if (!text) return undefined;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text as unknown;
    }
  }

  return response.json();
}

/** Resultado crudo de una ejecución: nunca lanza por errores HTTP. */
interface ExecutionResult {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: ApiHttpError;
}

/**
 * Ejecuta la petición y **lee el cuerpo una sola vez**.
 * En modo dedup, el cuerpo se consume dentro de la promesa compartida: dos
 * llamadas idénticas reciben el mismo resultado, no el mismo `Response`.
 */
async function executeRequest(prepared: PreparedRequest): Promise<ExecutionResult> {
  const response = await performRequest(prepared);

  if (!response.ok) {
    const error = await toApiHttpError(response, prepared.fullUrl);
    return { ok: false, status: response.status, error };
  }

  const data = await readBody(response, prepared);
  return { ok: true, status: response.status, data };
}

/**
 * Helper HTTP único (spec 034, T1).
 *
 * - `errorMode: "throw"` (por defecto): lanza `ApiHttpError` con `status`.
 * - `errorMode: "result"`: devuelve `{ ok, status, data?, error? }` sin lanzar,
 *   para los endpoints donde un 404 es un caso de negocio legítimo.
 *
 * El `url` se **verifica contra el contrato OpenAPI** (`keyof paths`) cuando
 * la ruta existe en el: una ruta mal escrita no compila. Las rutas que el
 * swagger todavia no documenta (p. ej. `/api/shifts/schedule/employee/{id}`)
 * pasan por la sobrecarga con `url: string`.
 */
export async function request<T = unknown>(
  spec: RequestSpec & { url: Path; errorMode: "result" },
): Promise<RequestResult<T>>;
export async function request<T = unknown>(
  spec: RequestSpec & { url: Path; errorMode?: "throw" },
): Promise<T>;
export async function request<T = unknown>(
  spec: RequestSpec & { errorMode: "result" },
): Promise<RequestResult<T>>;
export async function request<T = unknown>(spec: RequestSpec & { errorMode?: "throw" }): Promise<T>;
export async function request<T = unknown>(spec: RequestSpec): Promise<unknown> {
  const prepared = prepareRequest(spec);

  let result: ExecutionResult;
  if (prepared.dedup) {
    const dedupKey = `${prepared.method} ${prepared.fullUrl} ${getAuthHeaderString()}`;
    const inflight = inflightGets.get(dedupKey) as Promise<ExecutionResult> | undefined;
    if (inflight) {
      result = await inflight;
    } else {
      const promise = executeRequest(prepared);
      inflightGets.set(dedupKey, promise);
      const cleanup = (): void => {
        if (inflightGets.get(dedupKey) === promise) inflightGets.delete(dedupKey);
      };
      promise.then(cleanup, cleanup);
      result = await promise;
    }
  } else {
    result = await executeRequest(prepared);
  }

  if (spec.errorMode === "result") {
    return {
      ok: result.ok,
      status: result.status,
      data: result.data as T | undefined,
      error: result.error,
    } as RequestResult<T>;
  }

  if (!result.ok && result.error) {
    throw result.error;
  }

  return result.data as T;
}

export const apiClient = {
  /**
   * Typed GET request (idempotent: timeout + retry + inflight dedup).
   */
  async get<P extends Path>(
    url: P,
    options?: {
      params?: paths[P] extends { get: { parameters: { query?: infer Q } } } ? Q : never;
      path?: paths[P] extends { get: { parameters: { path: infer P } } } ? P : never;
      headers?: Record<string, string>;
      signal?: AbortSignal;
      timeoutMs?: number;
      retry?: boolean;
      dedup?: boolean;
      skipAuthEvents?: boolean;
      responseType?: ResponseType;
    },
  ): Promise<
    paths[P] extends { get: { responses: { 200: { content: { "application/json": infer R } } } } }
      ? R
      : unknown
  > {
    return request({
      method: "GET",
      url: String(url),
      params: options?.params as Record<string, unknown> | undefined,
      path: options?.path as Record<string, string | number> | undefined,
      headers: options?.headers,
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
      retry: options?.retry,
      dedup: options?.dedup,
      skipAuthEvents: options?.skipAuthEvents,
      responseType: options?.responseType,
    }) as Promise<never>;
  },

  /**
   * Typed POST request (non-idempotent: timeout, no auto-retry).
   */
  async post<P extends Path>(
    url: P,
    options: {
      body: paths[P] extends { post: { requestBody: { content: { "application/json": infer B } } } }
        ? B
        : unknown;
      params?: paths[P] extends { post: { parameters: { query?: infer Q } } } ? Q : never;
      path?: paths[P] extends { post: { parameters: { path: infer P } } } ? P : never;
      headers?: Record<string, string>;
      signal?: AbortSignal;
      timeoutMs?: number;
      skipAuthEvents?: boolean;
      responseType?: ResponseType;
    },
  ): Promise<
    paths[P] extends { post: { responses: { 201: { content: { "application/json": infer R } } } } }
      ? R
      : unknown
  > {
    return request({
      method: "POST",
      url: String(url),
      body: options.body,
      params: options.params as Record<string, unknown> | undefined,
      path: options.path as Record<string, string | number> | undefined,
      headers: options.headers,
      signal: options.signal,
      timeoutMs: options.timeoutMs,
      skipAuthEvents: options.skipAuthEvents,
      responseType: options.responseType,
    }) as Promise<never>;
  },

  /**
   * Typed PUT request (timeout, no auto-retry).
   */
  async put<P extends Path>(
    url: P,
    options: {
      body: paths[P] extends { put: { requestBody?: { content: { "application/json": infer B } } } }
        ? B
        : unknown;
      path?: paths[P] extends { put: { parameters: { path: infer P } } } ? P : never;
      headers?: Record<string, string>;
      signal?: AbortSignal;
      timeoutMs?: number;
      skipAuthEvents?: boolean;
      responseType?: ResponseType;
    },
  ): Promise<
    paths[P] extends { put: { responses: { 200: { content: { "application/json": infer R } } } } }
      ? R
      : unknown
  > {
    return request({
      method: "PUT",
      url: String(url),
      body: options.body,
      path: options.path as Record<string, string | number> | undefined,
      headers: options.headers,
      signal: options.signal,
      timeoutMs: options.timeoutMs,
      skipAuthEvents: options.skipAuthEvents,
      responseType: options.responseType,
    }) as Promise<never>;
  },

  /**
   * Typed PATCH request (timeout, no auto-retry).
   */
  async patch<P extends Path>(
    url: P,
    options: {
      body: paths[P] extends {
        patch: { requestBody?: { content: { "application/json": infer B } } };
      }
        ? B
        : unknown;
      path?: paths[P] extends { patch: { parameters: { path: infer P } } } ? P : never;
      headers?: Record<string, string>;
      signal?: AbortSignal;
      timeoutMs?: number;
      skipAuthEvents?: boolean;
      responseType?: ResponseType;
    },
  ): Promise<
    paths[P] extends { patch: { responses: { 200: { content: { "application/json": infer R } } } } }
      ? R
      : unknown
  > {
    return request({
      method: "PATCH",
      url: String(url),
      body: options.body,
      path: options.path as Record<string, string | number> | undefined,
      headers: options.headers,
      signal: options.signal,
      timeoutMs: options.timeoutMs,
      skipAuthEvents: options.skipAuthEvents,
      responseType: options.responseType,
    }) as Promise<never>;
  },

  /**
   * Typed DELETE request (timeout, typed error).
   */
  async delete<P extends Path>(
    url: P,
    options?: {
      path?: paths[P] extends { delete: { parameters: { path: infer P } } } ? P : never;
      headers?: Record<string, string>;
      signal?: AbortSignal;
      timeoutMs?: number;
      skipAuthEvents?: boolean;
    },
  ): Promise<void> {
    await request<void>({
      method: "DELETE",
      url: String(url),
      path: options?.path as Record<string, string | number> | undefined,
      headers: options?.headers,
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
      skipAuthEvents: options?.skipAuthEvents,
    });
  },
};

function resolvePath(path: string, params?: Record<string, string | number>): string {
  if (!params) return path;
  let resolved = path;
  for (const [key, value] of Object.entries(params)) {
    resolved = resolved.replace(`{${key}}`, String(value));
  }
  return resolved;
}

/**
 * Construye la query string.
 *
 * Un valor **array** se repite (`?tag=a&tag=b`): los filtros multidimensionales
 * de la auditoría usan el mismo parametro con varios valores.
 */
function buildQuery(params?: Record<string, unknown>): string {
  if (!params) return "";
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null) continue;
        query.append(key, String(item));
      }
      continue;
    }
    query.append(key, String(value));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}
