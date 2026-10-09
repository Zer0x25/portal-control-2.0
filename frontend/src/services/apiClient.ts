import { paths, components } from "../types/api";
import { authService } from "./authService";
import { API_BASE_URL } from "./apiBase";

/**
 * Shared HTTP hardening for Phase 1 (no visual change).
 * - ApiHttpError preserves numeric `status` so TanStack `hasHttpStatus` works.
 * - Default 15s timeout via AbortSignal.timeout (composable with user signal).
 * - GET-only retry on network/429/5xx with Retry-After respect + exponential backoff.
 * - GET inflight dedup for identical URL (disabled when caller passes `signal`).
 */

const DEFAULT_TIMEOUT_MS = 15000;
const MAX_GET_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 300;
const MAX_RETRY_AFTER_MS = 5000;

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

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

export interface RequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface GetOptions extends RequestOptions {
  params?: Record<string, unknown>;
  path?: Record<string, string | number>;
  retry?: boolean;
  dedup?: boolean;
}

type Path = keyof paths;
export type Schema<T extends keyof components["schemas"]> = components["schemas"][T];

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
    },
  ): Promise<
    paths[P] extends { get: { responses: { 200: { content: { "application/json": infer R } } } } }
      ? R
      : unknown
  > {
    const resolvedUrl = resolvePath(
      String(url),
      options?.path as Record<string, string | number> | undefined,
    );
    const fullUrl = `${getFullUrl(resolvedUrl)}${buildQuery(options?.params as Record<string, unknown> | undefined)}`;
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const retryEnabled = options?.retry ?? true;
    const dedupEnabled = (options?.dedup ?? true) && !options?.signal;
    const headers = {
      ...(authService.getAuthHeader() as Record<string, string>),
      ...options?.headers,
    };

    const run = async (): Promise<unknown> => {
      let lastError: unknown = null;
      const maxAttempts = retryEnabled ? MAX_GET_RETRIES + 1 : 1;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const response = await fetch(fullUrl, {
            headers,
            signal: buildTimeoutSignal(timeoutMs, options?.signal),
          });
          if (response.ok) return handleResponse(response, fullUrl);
          if (
            retryEnabled &&
            RETRYABLE_STATUSES.has(response.status) &&
            attempt < maxAttempts - 1
          ) {
            const retryAfter = getRetryAfterMs(response);
            await response.body?.cancel().catch(() => undefined);
            await sleep(retryAfter ?? RETRY_BASE_DELAY_MS * (attempt + 1));
            continue;
          }
          return handleResponse(response, fullUrl);
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
    };

    if (!dedupEnabled) return run() as Promise<never>;

    const dedupKey = `GET ${fullUrl} ${getAuthHeaderString()}`;
    const inflight = inflightGets.get(dedupKey) as Promise<never> | undefined;
    if (inflight) return inflight;
    const promise = run() as Promise<never>;
    inflightGets.set(dedupKey, promise);
    const cleanup = (): void => {
      if (inflightGets.get(dedupKey) === promise) inflightGets.delete(dedupKey);
    };
    promise.then(cleanup, cleanup);
    return promise;
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
    },
  ): Promise<
    paths[P] extends { post: { responses: { 201: { content: { "application/json": infer R } } } } }
      ? R
      : unknown
  > {
    const resolvedUrl = resolvePath(
      String(url),
      options?.path as Record<string, string | number> | undefined,
    );
    const fullUrl = `${getFullUrl(resolvedUrl)}${buildQuery(options?.params as Record<string, unknown> | undefined)}`;

    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authService.getAuthHeader() as Record<string, string>),
        ...options?.headers,
      },
      body: JSON.stringify(options.body),
      signal: buildTimeoutSignal(options?.timeoutMs ?? DEFAULT_TIMEOUT_MS, options?.signal),
    });

    return handleResponse(response, fullUrl);
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
    },
  ): Promise<
    paths[P] extends { put: { responses: { 200: { content: { "application/json": infer R } } } } }
      ? R
      : unknown
  > {
    const resolvedUrl = resolvePath(
      String(url),
      options?.path as Record<string, string | number> | undefined,
    );

    const response = await fetch(getFullUrl(resolvedUrl), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(authService.getAuthHeader() as Record<string, string>),
        ...options?.headers,
      },
      body: JSON.stringify(options.body),
      signal: buildTimeoutSignal(options?.timeoutMs ?? DEFAULT_TIMEOUT_MS, options?.signal),
    });

    return handleResponse(response, getFullUrl(resolvedUrl));
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
    },
  ): Promise<void> {
    const resolvedUrl = resolvePath(
      String(url),
      options?.path as Record<string, string | number> | undefined,
    );
    const fullUrl = getFullUrl(resolvedUrl);

    const response = await fetch(fullUrl, {
      method: "DELETE",
      headers: {
        ...(authService.getAuthHeader() as Record<string, string>),
        ...options?.headers,
      },
      signal: buildTimeoutSignal(options?.timeoutMs ?? DEFAULT_TIMEOUT_MS, options?.signal),
    });

    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent("unauthorized"));
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "API Error" }));
      const message =
        (errorData as { message?: string }).message ??
        (errorData as { error?: string }).error ??
        `API Error (${response.status})`;
      throw new ApiHttpError(message, response.status, fullUrl, errorData);
    }
  },
};

/**
 * Base response handler with auth check and error parsing.
 * Preserves numeric status via ApiHttpError so Query retry guards work.
 */
async function handleResponse(response: Response, url: string) {
  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent("unauthorized"));
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "API Error" }));
    const message =
      (errorData as { message?: string }).message ??
      (errorData as { error?: string }).error ??
      `API Error (${response.status})`;
    throw new ApiHttpError(message, response.status, url, errorData);
  }

  if (response.status === 204) return undefined;
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
