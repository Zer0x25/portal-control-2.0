import { request as apiRequest } from "./apiClient";
import { API_ORIGIN_URL } from "./apiBase";
import { ValidateClosureResponse } from "../types/supervisor";

type CompanyPolicy = {
  url: string;
  originalName: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
};

export type BrandLogo = {
  source: { kind: "upload" | "url"; ref: string };
  width: number;
  height: number;
  /** Solo presente cuando la fuente es un archivo subido (ruta relativa del backend). */
  url?: string;
};

const normalizeApiUrl = (url: string): string => {
  try {
    return new URL(url, API_ORIGIN_URL).toString();
  } catch {
    return url;
  }
};

export const configService = {
  /**
   * Reglamento publico (sin autenticacion).
   *
   * Un 404 o un cuerpo `null` significan "no hay reglamento cargado": es un
   * estado esperado, no un error, asi que el cliente no lanza (modo
   * `result`) y el service devuelve `null`.
   */
  async getPublicCompanyPolicy(): Promise<CompanyPolicy | null> {
    try {
      const result = await apiRequest<CompanyPolicy | null>({
        method: "GET",
        url: "/api/configs/public/company-policy",
        errorMode: "result",
        skipAuthEvents: true,
      });
      if (!result.ok) return null;
      // 200 + null cuando no hay reglamento cargado (estado esperado, no error).
      const policy = result.data;
      if (!policy) return null;
      return {
        ...policy,
        url: normalizeApiUrl(policy.url),
      };
    } catch {
      return null;
    }
  },

  /**
   * Logo publico (sin autenticacion).
   *
   * Mismo contrato que el reglamento: "sin logo" es un estado esperado y no
   * debe cerrar la sesion ni ensuciar la consola con un 404.
   */
  async getPublicBrandLogo(): Promise<BrandLogo | null> {
    try {
      const result = await apiRequest<BrandLogo | null>({
        method: "GET",
        url: "/api/configs/public/brand-logo",
        errorMode: "result",
        skipAuthEvents: true,
      });
      if (!result.ok) return null;
      const logo = result.data;
      if (!logo || typeof logo !== "object" || !logo.source) return null;
      return {
        ...logo,
        url: logo.url ? normalizeApiUrl(logo.url) : undefined,
      };
    } catch {
      return null;
    }
  },

  async uploadBrandLogo(file: File): Promise<BrandLogo> {
    const formData = new FormData();
    formData.append("file", file);

    // El cuerpo es `FormData`: el cliente omite el `Content-Type` para que el
    // navegador fije el `boundary` de `multipart/form-data`.
    const logo = await apiRequest<BrandLogo>({
      method: "POST",
      url: "/api/configs/brand-logo",
      body: formData,
    });

    return {
      ...logo,
      url: logo.url ? normalizeApiUrl(logo.url) : undefined,
    };
  },

  async uploadCompanyPolicy(file: File): Promise<CompanyPolicy> {
    const formData = new FormData();
    formData.append("file", file);

    const policy = await apiRequest<CompanyPolicy>({
      method: "POST",
      url: "/api/configs/company-policy",
      body: formData,
    });

    return {
      ...policy,
      url: normalizeApiUrl(policy.url),
    };
  },

  async get<T = unknown>(key: string): Promise<T | null> {
    const result = await apiRequest<T>({
      method: "GET",
      url: "/api/configs/{key}",
      path: { key },
      errorMode: "result",
    });
    if (!result.ok) return null;
    return result.data ?? null;
  },

  async list<T = unknown>(): Promise<{ key: string; value: T }[]> {
    const result = await apiRequest<{ key: string; value: T }[]>({
      method: "GET",
      url: "/api/configs",
      errorMode: "result",
    });
    if (!result.ok) return [];
    return result.data ?? [];
  },

  async set<T>(key: string, value: T): Promise<T> {
    return apiRequest<T>({
      method: "POST",
      url: "/api/configs/{key}",
      path: { key },
      body: { value },
    });
  },

  async validateClosure(date: string): Promise<ValidateClosureResponse> {
    return apiRequest<ValidateClosureResponse>({
      method: "GET",
      url: "/api/configs/validate-closure",
      params: { date },
    });
  },

  async getServerTime(): Promise<{
    iso: string;
    timestamp: number;
    timezone: string;
    businessDate: string;
  } | null> {
    try {
      const result = await apiRequest<{
        iso: string;
        timestamp: number;
        timezone: string;
        businessDate: string;
      }>({
        method: "GET",
        url: "/api/configs/server-time",
        errorMode: "result",
      });
      if (!result.ok) return null;
      return result.data ?? null;
    } catch (error) {
      console.error("Error fetching server time:", error);
      return null;
    }
  },

  async getHealth(): Promise<{
    status: string;
    instanceId: string | null;
  } | null> {
    try {
      const result = await apiRequest<{ data?: HealthPayload } & HealthPayload>({
        method: "GET",
        url: "/api/health",
        errorMode: "result",
        skipAuthEvents: true,
        retry: false,
      });
      if (!result.ok) return null;
      const body = result.data;
      const payload = body?.data ?? body;
      return {
        status: payload?.status ?? "unknown",
        instanceId: payload?.instanceId ?? null,
      };
    } catch (error) {
      console.error("Error fetching health:", error);
      return null;
    }
  },
};

/** Payload de salud leido por `configService.getHealth`. */
interface HealthPayload {
  status?: string;
  instanceId?: string | null;
}
