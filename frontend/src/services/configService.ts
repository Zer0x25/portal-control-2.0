import { apiClient } from "./apiClient";
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
  async getPublicCompanyPolicy(): Promise<CompanyPolicy | null> {
    try {
      const result = await apiClient.request<CompanyPolicy | null>(
        "/api/configs/public/company-policy",
        { mode: "result" },
      );
      if (!result.ok || !result.data) return null;
      return {
        ...result.data,
        url: normalizeApiUrl(result.data.url),
      };
    } catch {
      return null;
    }
  },

  async getPublicBrandLogo(): Promise<BrandLogo | null> {
    try {
      // 404 es un estado esperado legítimo (sin logo configurado) -> modo no-launching (AC1, AC2)
      const result = await apiClient.request<BrandLogo | null>("/api/configs/public/brand-logo", {
        mode: "result",
      });
      if (!result.ok || !result.data || typeof result.data !== "object" || !result.data.source) {
        return null;
      }
      return {
        ...result.data,
        url: result.data.url ? normalizeApiUrl(result.data.url) : undefined,
      };
    } catch {
      return null;
    }
  },

  async uploadBrandLogo(file: File): Promise<BrandLogo> {
    const formData = new FormData();
    formData.append("file", file);

    const logo = (await apiClient.post("/api/configs/brand-logo" as never, {
      body: formData,
    })) as BrandLogo;

    return {
      ...logo,
      url: logo.url ? normalizeApiUrl(logo.url) : undefined,
    };
  },

  async uploadCompanyPolicy(file: File): Promise<CompanyPolicy> {
    const formData = new FormData();
    formData.append("file", file);

    const policy = (await apiClient.post("/api/configs/company-policy" as never, {
      body: formData,
    })) as CompanyPolicy;

    return {
      ...policy,
      url: normalizeApiUrl(policy.url),
    };
  },

  async get<T = unknown>(key: string): Promise<T | null> {
    const result = await apiClient.request<T>(`/api/configs/${key}`, { mode: "result" });
    if (!result.ok) return null;
    return result.data;
  },

  async list<T = unknown>(): Promise<{ key: string; value: T }[]> {
    const result = await apiClient.request<{ key: string; value: T }[]>("/api/configs/", {
      mode: "result",
    });
    if (!result.ok || !Array.isArray(result.data)) return [];
    return result.data;
  },

  async set<T>(key: string, value: T): Promise<T> {
    return (await apiClient.post(`/api/configs/${key}` as never, {
      body: { value } as never,
    })) as T;
  },

  async validateClosure(date: string): Promise<ValidateClosureResponse> {
    return (await apiClient.get("/api/configs/validate-closure" as never, {
      params: { date },
    })) as ValidateClosureResponse;
  },

  async getServerTime(): Promise<{
    iso: string;
    timestamp: number;
    timezone: string;
    businessDate: string;
  } | null> {
    const result = await apiClient.request<{
      iso: string;
      timestamp: number;
      timezone: string;
      businessDate: string;
    }>("/api/configs/server-time", { mode: "result" });
    if (!result.ok) return null;
    return result.data;
  },

  async getHealth(): Promise<{
    status: string;
    instanceId: string | null;
  } | null> {
    const result = await apiClient.request<{
      data?: { status?: string; instanceId?: string | null };
      status?: string;
      instanceId?: string | null;
    }>("/api/health", { mode: "result" });
    if (!result.ok || !result.data) return null;
    const payload = result.data.data ?? result.data;
    return {
      status: payload?.status ?? "unknown",
      instanceId: payload?.instanceId ?? null,
    };
  },
};
