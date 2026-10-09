import { authService } from "./authService";
import { API_BASE_URL, API_ORIGIN_URL } from "./apiBase";
import { ValidateClosureResponse } from "../types/supervisor";

const API_URL = `${API_BASE_URL}/configs`;
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
      const response = await fetch(`${API_BASE_URL}/configs/public/company-policy`);
      if (!response.ok) return null;
      const policy = (await response.json()) as CompanyPolicy;
      return {
        ...policy,
        url: normalizeApiUrl(policy.url),
      };
    } catch {
      return null;
    }
  },

  async getPublicBrandLogo(): Promise<BrandLogo | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/configs/public/brand-logo`);
      if (!response.ok) return null;
      const logo = (await response.json()) as BrandLogo;
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

    const response = await fetch(`${API_BASE_URL}/configs/brand-logo`, {
      method: "POST",
      headers: {
        ...(authService.getAuthHeader() as Record<string, string>),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Error al subir logo" }));
      throw new Error(error.message || "Error al subir logo");
    }

    const logo = (await response.json()) as BrandLogo;
    return {
      ...logo,
      url: logo.url ? normalizeApiUrl(logo.url) : undefined,
    };
  },

  async uploadCompanyPolicy(file: File): Promise<CompanyPolicy> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/configs/company-policy`, {
      method: "POST",
      headers: {
        ...(authService.getAuthHeader() as Record<string, string>),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Error al subir reglamento" }));
      throw new Error(error.message || "Error al subir reglamento");
    }

    const policy = (await response.json()) as CompanyPolicy;
    return {
      ...policy,
      url: normalizeApiUrl(policy.url),
    };
  },

  async get<T = unknown>(key: string): Promise<T | null> {
    const response = await fetch(`${API_URL}/${key}`, {
      headers: { ...(authService.getAuthHeader() as Record<string, string>) },
    });
    if (!response.ok) return null;
    return response.json();
  },

  async list<T = unknown>(): Promise<{ key: string; value: T }[]> {
    const response = await fetch(`${API_URL}/`, {
      headers: { ...(authService.getAuthHeader() as Record<string, string>) },
    });
    if (!response.ok) return [];
    return response.json();
  },

  async set<T>(key: string, value: T): Promise<T> {
    const response = await fetch(`${API_URL}/${key}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authService.getAuthHeader() as Record<string, string>),
      },
      body: JSON.stringify({ value }),
    });
    if (!response.ok) {
      let errorMessage = "Error al guardar configuración";
      try {
        const errorData = await response.json();
        if (errorData.message) errorMessage = errorData.message;
      } catch {
        // Fallback to default message
      }
      throw new Error(errorMessage);
    }
    return response.json();
  },

  async validateClosure(date: string): Promise<ValidateClosureResponse> {
    const response = await fetch(`${API_URL}/validate-closure?date=${date}`, {
      headers: { ...(authService.getAuthHeader() as Record<string, string>) },
    });
    if (!response.ok) {
      throw new Error("Error al validar cierre contable");
    }
    return response.json();
  },

  async getServerTime(): Promise<{
    iso: string;
    timestamp: number;
    timezone: string;
    businessDate: string;
  } | null> {
    try {
      const response = await fetch(`${API_URL}/server-time`, {
        headers: { ...(authService.getAuthHeader() as Record<string, string>) },
      });
      if (!response.ok) return null;
      return response.json();
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
      // /health is outside /api
      const response = await fetch(`${API_ORIGIN_URL}/api/health`);
      if (!response.ok) return null;
      return response.json();
    } catch (error) {
      console.error("Error fetching health:", error);
      return null;
    }
  },
};
