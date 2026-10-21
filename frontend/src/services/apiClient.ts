import { paths, components } from "../types/api";
import { authService } from "./authService";
import { API_BASE_URL } from "./apiBase";

/**
 * Shared HTTP client consolidation (Spec 034 / ADR-0024).
 * - ApiHttpError preserves numeric `status` so TanStack status classification works.
 * - Default 15s timeout via AbortSignal.timeout (composable with user signal).
 * - GET-only retry on network/429/5xx with Retry-After respect + exponential backoff.
 * - Single retry owner: transport-level retry lives in apiClient (max 3 total attempts).
 * - GET inflight dedup for identical URL (disabled when caller passes `signal`).
 * - Form-Data support (omits Content-Type to allow browser multipart boundary).
 * - Binary response mode ({ blob, headers, filename }) preserving Content-Disposition.
 * - PATCH method support.
 * - rate_limited event dispatch with 5s anti-storm lock.
 * - skipAuthEvents suppression for anonymous endpoints (/auth/login, /auth/mfa/validate, /auth/kiosk-login).
 */

const DEFAULT_TIMEOUT_MS = 15000;
const MAX_GET_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 300;
const MAX_RETRY_AFTER_MS = 5000;

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

const ANONYMOUS_AUTH_ENDPOINTS = [
  /\/auth\/login(?:\?|$)/,
  /\/auth\/mfa\/validate(?:\?|$)/,
  /\/auth\/kiosk-login(?:\?|$)/,
];

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

export type RateLimitedDetail = {
  status: number;
  url: string;
  retryAfter?: string | null;
};

export type BinaryResponse = {
  blob: Blob;
  headers: Headers;
  filename: string;
};

export type ApiResult<T> =
  | { ok: true; status: number; data: T; headers: Headers; filename?: string; error?: undefined }
  | { ok: false; status: number; error: ApiHttpError; data?: unknown };

export type Path = keyof paths;
export type Schema<T extends keyof components["schemas"]> = components["schemas"][T];
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

declare global {
  interface Window {
    __fetchGuardInstalled?: boolean;
    __rateLimitEventLock?: boolean;
  }
}

let rateLimitLock = false;

export function resetRateLimitLock(): void {
  rateLimitLock = false;
  if (typeof window !== "undefined") {
    window.__rateLimitEventLock = false;
  }
}

function isAnonymousAuthEndpoint(url: string): boolean {
  return ANONYMOUS_AUTH_ENDPOINTS.some((re) => re.test(url));
}

function notifyRateLimited(url: string, response: Response, skipAuthEvents?: boolean): void {
  if (skipAuthEvents || isAnonymousAuthEndpoint(url)) return;
  if (rateLimitLock || (typeof window !== "undefined" && window.__rateLimitEventLock)) return;

  rateLimitLock = true;
  if (typeof window !== "undefined") {
    window.__rateLimitEventLock = true;
  }

  const detail: RateLimitedDetail = {
    status: response.status,
    url,
    retryAfter: response.headers.get("Retry-After"),
  };

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("rate_limited", { detail }));
  }

  setTimeout(() => {
    resetRateLimitLock();
  }, 5000);
}

function notifyUnauthorized(url: string, skipAuthEvents?: boolean): void {
  if (skipAuthEvents || isAnonymousAuthEndpoint(url)) return;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("unauthorized"));
  }
}

export function extractFilename(
  disposition: string | null | undefined,
  fallback = "download",
): string {
  if (!disposition) return fallback;
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      return utf8Match[1].trim();
    }
  }
  const match = disposition.match(/filename="?([^";]+)"?/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return fallback;
}

/** Inflight GET dedup: same method+URL+auth shares one network promise. */
const inflightGets = new Map<string, Promise<unknown>>();

function getAuthHeaderString(): string {
  try {
    const headers = authService.getAuthHeader() as Record<string, string>;
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

export interface BaseRequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
  skipAuthEvents?: boolean;
}

export interface RequestOptions<TBody = unknown> extends BaseRequestOptions {
  method?: HttpMethod;
  body?: TBody;
  params?: Record<string, unknown> | unknown;
  path?: Record<string, string | number> | unknown;
  retry?: boolean;
  dedup?: boolean;
  responseType?: "json" | "blob" | "stream";
  mode?: "throw" | "result";
}

export interface GetOptions extends BaseRequestOptions {
  params?: Record<string, unknown>;
  path?: Record<string, string | number>;
  retry?: boolean;
  dedup?: boolean;
}

/**
 * Normalizes the URL to prevent double /api prefix if API_BASE_URL ends with /api
 * and the path also starts with /api.
 */
function getFullUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (base.endsWith("/api") && normalizedPath.startsWith("/api/")) {
    return `${base}${normalizedPath.substring(4)}`;
  }

  return `${base}${normalizedPath}`;
}

function resolvePath(path: string, params?: Record<string, string | number>): string {
  if (!params) return path;
  let resolved = path;
  for (const [key, value] of Object.entries(params)) {
    resolved = resolved.replace(`{${key}}`, String(value));
  }
  return resolved;
}

function buildQuery(params?: Record<string, unknown>): string {
  if (!params) return "";
  const entries = Object.entries(params).reduce(
    (acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = String(value);
      }
      return acc;
    },
    {} as Record<string, string>,
  );
  const query = new URLSearchParams(entries).toString();
  return query ? `?${query}` : "";
}

/**
 * Base response handler with auth check and error parsing.
 * Preserves numeric status via ApiHttpError so Query retry guards work.
 */
async function handleResponse<T = unknown>(
  response: Response,
  url: string,
  responseType: "json" | "blob" | "stream" = "json",
  skipAuthEvents?: boolean,
): Promise<T> {
  if (response.status === 401) {
    notifyUnauthorized(url, skipAuthEvents);
  }

  if (!response.ok) {
    let errorData: unknown = null;
    try {
      if (typeof response.json === "function") {
        errorData = await response.json();
      } else if (typeof response.text === "function") {
        errorData = await response.text();
      }
    } catch {
      errorData = { message: "API Error" };
    }
    const message =
      (errorData as { message?: string })?.message ??
      (errorData as { error?: string })?.error ??
      `API Error (${response.status})`;
    throw new ApiHttpError(message, response.status, url, errorData);
  }

  if (responseType === "stream") {
    return response as unknown as T;
  }

  if (responseType === "blob") {
    const blob = typeof response.blob === "function" ? await response.blob() : new Blob();
    const disposition = response.headers?.get?.("Content-Disposition");
    const filename = extractFilename(disposition);
    return { blob, headers: response.headers ?? new Headers(), filename } as unknown as T;
  }

  if (response.status === 204) return undefined as unknown as T;

  if (typeof response.json === "function") {
    try {
      return (await response.json()) as T;
    } catch {
      // fallback to text if json fails
    }
  }

  if (typeof response.text === "function") {
    const text = await response.text().catch(() => "");
    if (!text) return undefined as unknown as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  return undefined as unknown as T;
}

async function executeNetworkRequest<T>(
  fullUrl: string,
  method: HttpMethod,
  options?: RequestOptions,
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const isGet = method === "GET";
  const retryEnabled = isGet ? (options?.retry ?? true) : false;
  const responseType = options?.responseType ?? "json";
  const skipAuth = options?.skipAuthEvents ?? isAnonymousAuthEndpoint(fullUrl);

  const isFormData = typeof FormData !== "undefined" && options?.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(authService.getAuthHeader() as Record<string, string>),
    ...options?.headers,
  };

  if (
    !isFormData &&
    !headers["Content-Type"] &&
    !headers["content-type"] &&
    options?.body !== undefined
  ) {
    headers["Content-Type"] = "application/json";
  }

  if (isFormData) {
    delete headers["Content-Type"];
    delete headers["content-type"];
  }

  const body = isFormData
    ? (options?.body as BodyInit)
    : options?.body !== undefined
      ? JSON.stringify(options.body)
      : undefined;

  let lastError: unknown = null;
  const maxAttempts = retryEnabled ? MAX_GET_RETRIES + 1 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(fullUrl, {
        method,
        headers,
        body,
        signal: buildTimeoutSignal(timeoutMs, options?.signal),
      });

      if (response.status === 429) {
        notifyRateLimited(fullUrl, response, skipAuth);
      }

      if (response.ok) {
        return await handleResponse<T>(response, fullUrl, responseType, skipAuth);
      }

      if (retryEnabled && RETRYABLE_STATUSES.has(response.status) && attempt < maxAttempts - 1) {
        const retryAfter = getRetryAfterMs(response);
        await response.body?.cancel().catch(() => undefined);
        await sleep(retryAfter ?? RETRY_BASE_DELAY_MS * (attempt + 1));
        continue;
      }

      return await handleResponse<T>(response, fullUrl, responseType, skipAuth);
    } catch (error) {
      lastError = error;
      if (options?.signal?.aborted) throw error;
      if (retryEnabled && isNetworkError(error) && attempt < maxAttempts - 1) {
        await sleep(RETRY_BASE_DELAY_MS * (attempt + 1));
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

/**
 * Helper request<T>() typed against paths / schemas with two error modes:
 * - mode: "throw" (default): throws ApiHttpError on non-2xx
 * - mode: "result": returns ApiResult<T> without throwing
 */
export interface RequestFunction {
  <T = unknown>(url: string, options: RequestOptions & { mode: "result" }): Promise<ApiResult<T>>;
  <T = unknown>(url: string, options?: RequestOptions & { mode?: "throw" }): Promise<T>;
  <T = unknown>(url: string, options?: RequestOptions): Promise<T | ApiResult<T>>;
}

const request: RequestFunction = async function <T = unknown>(
  url: string,
  options?: RequestOptions,
): Promise<T | ApiResult<T>> {
  const resolvedPath = resolvePath(
    url,
    options?.path as Record<string, string | number> | undefined,
  );
  const fullUrl = `${getFullUrl(resolvedPath)}${buildQuery(options?.params as Record<string, unknown> | undefined)}`;
  const method = options?.method ?? "GET";
  const isGet = method === "GET";
  const dedupEnabled = isGet && (options?.dedup ?? true) && !options?.signal;

  const run = async (): Promise<T> => {
    return executeNetworkRequest<T>(fullUrl, method, options);
  };

  if (options?.mode === "result") {
    try {
      const data = dedupEnabled ? await runWithDedup(fullUrl, run) : await run();
      return {
        ok: true,
        status: 200,
        data,
        headers: new Headers(),
      };
    } catch (err) {
      if (err instanceof ApiHttpError) {
        return {
          ok: false,
          status: err.status,
          error: err,
          data: err.data,
        };
      }
      const error = new ApiHttpError(
        err instanceof Error ? err.message : "Network error",
        0,
        fullUrl,
      );
      return {
        ok: false,
        status: 0,
        error,
      };
    }
  }

  if (!dedupEnabled) {
    return run();
  }

  return runWithDedup(fullUrl, run);
};

export const apiClient = {
  request,

  /**
   * Typed GET request (idempotent: timeout + retry + inflight dedup).
   */
  async get<P extends Path | (string & Record<never, never>)>(
    url: P,
    options?: {
      params?: [P] extends [Path]
        ? paths[P] extends { get: { parameters: { query?: infer Q } } }
          ? Q
          : Record<string, unknown>
        : Record<string, unknown>;
      path?: [P] extends [Path]
        ? paths[P] extends { get: { parameters: { path: infer Pth } } }
          ? Pth
          : Record<string, string | number>
        : Record<string, string | number>;
      headers?: Record<string, string>;
      signal?: AbortSignal;
      timeoutMs?: number;
      retry?: boolean;
      dedup?: boolean;
      skipAuthEvents?: boolean;
    },
  ): Promise<
    [P] extends [Path]
      ? paths[P] extends {
          get: { responses: { 200: { content: { "application/json": infer R } } } };
        }
        ? R
        : unknown
      : unknown
  > {
    return apiClient.request(
      url as string,
      {
        method: "GET",
        mode: "throw",
        ...options,
      } as RequestOptions & { mode: "throw" },
    ) as Promise<never>;
  },

  /**
   * Typed POST request (non-idempotent: timeout, no auto-retry).
   * Supports FormData bodies (omitting Content-Type header).
   */
  async post<P extends Path | (string & Record<never, never>)>(
    url: P,
    options: {
      body?:
        | ([P] extends [Path]
            ? paths[P] extends {
                post: { requestBody: { content: { "application/json": infer B } } };
              }
              ? B
              : unknown
            : unknown)
        | FormData
        | unknown;
      params?: [P] extends [Path]
        ? paths[P] extends { post: { parameters: { query?: infer Q } } }
          ? Q
          : Record<string, unknown>
        : Record<string, unknown>;
      path?: [P] extends [Path]
        ? paths[P] extends { post: { parameters: { path: infer Pth } } }
          ? Pth
          : Record<string, string | number>
        : Record<string, string | number>;
      headers?: Record<string, string>;
      signal?: AbortSignal;
      timeoutMs?: number;
      skipAuthEvents?: boolean;
    },
  ): Promise<
    [P] extends [Path]
      ? paths[P] extends {
          post: { responses: { 201: { content: { "application/json": infer R } } } };
        }
        ? R
        : paths[P] extends {
              post: { responses: { 200: { content: { "application/json": infer R2 } } } };
            }
          ? R2
          : unknown
      : unknown
  > {
    return apiClient.request(
      url as string,
      {
        method: "POST",
        mode: "throw",
        ...options,
      } as RequestOptions & { mode: "throw" },
    ) as Promise<never>;
  },

  /**
   * Typed PUT request (timeout, no auto-retry).
   * Supports FormData bodies.
   */
  async put<P extends Path | (string & Record<never, never>)>(
    url: P,
    options: {
      body?:
        | ([P] extends [Path]
            ? paths[P] extends {
                put: { requestBody: { content: { "application/json": infer B } } };
              }
              ? B
              : unknown
            : unknown)
        | FormData
        | unknown;
      path?: [P] extends [Path]
        ? paths[P] extends { put: { parameters: { path: infer Pth } } }
          ? Pth
          : Record<string, string | number>
        : Record<string, string | number>;
      headers?: Record<string, string>;
      signal?: AbortSignal;
      timeoutMs?: number;
      skipAuthEvents?: boolean;
    },
  ): Promise<
    [P] extends [Path]
      ? paths[P] extends {
          put: { responses: { 200: { content: { "application/json": infer R } } } };
        }
        ? R
        : unknown
      : unknown
  > {
    return apiClient.request(
      url as string,
      {
        method: "PUT",
        mode: "throw",
        ...options,
      } as RequestOptions & { mode: "throw" },
    ) as Promise<never>;
  },

  /**
   * Typed PATCH request (timeout, no auto-retry).
   * Supports FormData bodies.
   */
  async patch<P extends Path | (string & Record<never, never>)>(
    url: P,
    options: {
      body?:
        | ([P] extends [Path]
            ? paths[P] extends {
                patch: { requestBody: { content: { "application/json": infer B } } };
              }
              ? B
              : unknown
            : unknown)
        | FormData
        | unknown;
      params?: Record<string, unknown>;
      path?: [P] extends [Path]
        ? paths[P] extends { patch: { parameters: { path: infer Pth } } }
          ? Pth
          : Record<string, string | number>
        : Record<string, string | number>;
      headers?: Record<string, string>;
      signal?: AbortSignal;
      timeoutMs?: number;
      skipAuthEvents?: boolean;
    },
  ): Promise<
    [P] extends [Path]
      ? paths[P] extends {
          patch: { responses: { 200: { content: { "application/json": infer R } } } };
        }
        ? R
        : unknown
      : unknown
  > {
    return apiClient.request(
      url as string,
      {
        method: "PATCH",
        mode: "throw",
        ...options,
      } as RequestOptions & { mode: "throw" },
    ) as Promise<never>;
  },

  /**
   * Typed DELETE request (timeout, typed error).
   */
  async delete<P extends Path | (string & Record<never, never>)>(
    url: P,
    options?: {
      path?: [P] extends [Path]
        ? paths[P] extends { delete: { parameters: { path: infer Pth } } }
          ? Pth
          : Record<string, string | number>
        : Record<string, string | number>;
      params?: Record<string, unknown>;
      headers?: Record<string, string>;
      signal?: AbortSignal;
      timeoutMs?: number;
      skipAuthEvents?: boolean;
    },
  ): Promise<void> {
    await apiClient.request(
      url as string,
      {
        method: "DELETE",
        mode: "throw",
        ...options,
      } as RequestOptions & { mode: "throw" },
    );
  },

  /**
   * Binary response helper ({ blob, headers, filename }).
   * Does not corrupt PDF/Excel files with text decoding.
   */
  async blob(url: string, options?: Omit<RequestOptions, "responseType">): Promise<BinaryResponse> {
    return (await apiClient.request<BinaryResponse>(url, {
      ...options,
      responseType: "blob",
      mode: "throw",
    } as RequestOptions & { mode: "throw" })) as BinaryResponse;
  },
};

function runWithDedup<T>(fullUrl: string, run: () => Promise<T>): Promise<T> {
  const dedupKey = `GET ${fullUrl} ${getAuthHeaderString()}`;
  const inflight = inflightGets.get(dedupKey) as Promise<T> | undefined;
  if (inflight) return inflight;
  const promise = run();
  inflightGets.set(dedupKey, promise as Promise<unknown>);
  const cleanup = (): void => {
    if (inflightGets.get(dedupKey) === promise) inflightGets.delete(dedupKey);
  };
  promise.then(cleanup, cleanup);
  return promise;
}
