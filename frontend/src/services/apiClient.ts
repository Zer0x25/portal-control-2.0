import { paths, components } from "../types/api";
import { authService } from "./authService";
import { API_BASE_URL } from "./apiBase";

/**
 * Type-safe API Client wrapper for fetch.
 * Provides full TypeScript support based on the OpenAPI spec.
 */

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
   * Typed GET request
   */
  async get<P extends Path>(
    url: P,
    options?: {
      params?: paths[P] extends { get: { parameters: { query?: infer Q } } } ? Q : never;
      path?: paths[P] extends { get: { parameters: { path: infer P } } } ? P : never;
      headers?: Record<string, string>;
    },
  ): Promise<
    paths[P] extends { get: { responses: { 200: { content: { "application/json": infer R } } } } }
      ? R
      : unknown
  > {
    let resolvedUrl: string = url;
    if (options?.path) {
      Object.entries(options.path as Record<string, string | number>).forEach(([key, value]) => {
        resolvedUrl = resolvedUrl.replace(`{${key}}`, String(value));
      });
    }

    const query = options?.params
      ? "?" +
        new URLSearchParams(
          Object.entries(options.params as Record<string, unknown>).reduce(
            (acc, [key, value]) => {
              if (value !== undefined && value !== null) {
                acc[key] = String(value);
              }
              return acc;
            },
            {} as Record<string, string>,
          ),
        ).toString()
      : "";

    const response = await fetch(`${getFullUrl(resolvedUrl)}${query}`, {
      headers: {
        ...(authService.getAuthHeader() as Record<string, string>),
        ...options?.headers,
      },
    });

    return handleResponse(response);
  },

  /**
   * Typed POST request
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
    },
  ): Promise<
    paths[P] extends { post: { responses: { 201: { content: { "application/json": infer R } } } } }
      ? R
      : unknown
  > {
    let resolvedUrl: string = url;
    if (options?.path) {
      Object.entries(options.path as Record<string, string | number>).forEach(([key, value]) => {
        resolvedUrl = resolvedUrl.replace(`{${key}}`, String(value));
      });
    }

    const query = options?.params
      ? "?" +
        new URLSearchParams(
          Object.entries(options.params as Record<string, unknown>).reduce(
            (acc, [key, value]) => {
              if (value !== undefined && value !== null) {
                acc[key] = String(value);
              }
              return acc;
            },
            {} as Record<string, string>,
          ),
        ).toString()
      : "";

    const response = await fetch(`${getFullUrl(resolvedUrl)}${query}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authService.getAuthHeader() as Record<string, string>),
        ...options?.headers,
      },
      body: JSON.stringify(options.body),
    });

    return handleResponse(response);
  },

  /**
   * Typed PUT request
   */
  async put<P extends Path>(
    url: P,
    options: {
      body: paths[P] extends { put: { requestBody?: { content: { "application/json": infer B } } } }
        ? B
        : unknown;
      path?: paths[P] extends { put: { parameters: { path: infer P } } } ? P : never;
      headers?: Record<string, string>;
    },
  ): Promise<
    paths[P] extends { put: { responses: { 200: { content: { "application/json": infer R } } } } }
      ? R
      : unknown
  > {
    let resolvedUrl: string = url;
    if (options?.path) {
      Object.entries(options.path as Record<string, string | number>).forEach(([key, value]) => {
        resolvedUrl = resolvedUrl.replace(`{${key}}`, String(value));
      });
    }

    const response = await fetch(getFullUrl(resolvedUrl), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(authService.getAuthHeader() as Record<string, string>),
        ...options?.headers,
      },
      body: JSON.stringify(options.body),
    });

    return handleResponse(response);
  },

  /**
   * Typed DELETE request
   */
  async delete<P extends Path>(
    url: P,
    options?: {
      path?: paths[P] extends { delete: { parameters: { path: infer P } } } ? P : never;
      headers?: Record<string, string>;
    },
  ): Promise<void> {
    let resolvedUrl: string = url;
    if (options?.path) {
      Object.entries(options.path as Record<string, string | number>).forEach(([key, value]) => {
        resolvedUrl = resolvedUrl.replace(`{${key}}`, String(value));
      });
    }

    const response = await fetch(getFullUrl(resolvedUrl), {
      method: "DELETE",
      headers: {
        ...(authService.getAuthHeader() as Record<string, string>),
        ...options?.headers,
      },
    });

    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent("unauthorized"));
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "API Error" }));
      throw new Error(error.message || "API Error");
    }
  },
};

/**
 * Base response handler with auth check and error parsing
 */
async function handleResponse(response: Response) {
  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent("unauthorized"));
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "API Error" }));
    throw new Error(error.message || `API Error (${response.status})`);
  }

  return response.json();
}
