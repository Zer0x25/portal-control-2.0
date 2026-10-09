import { describe, it, expect } from "vitest";
import { deriveBackendStatus, type HealthData } from "./useHealthQuery";
import { ApiHttpError } from "../../services/apiClient";

const baseData = {
  status: "healthy",
  timestamp: "",
  uptime: 0,
  system: {},
  database: {},
  backup: {},
  integrity: {},
  responseTime: 0,
} as unknown as HealthData;

describe("deriveBackendStatus (DB caída = rojo)", () => {
  it("data healthy => healthy", () => {
    expect(deriveBackendStatus(baseData, null, false)).toBe("healthy");
  });

  it("data degraded => degraded", () => {
    expect(deriveBackendStatus({ ...baseData, status: "degraded" }, null, false)).toBe("degraded");
  });

  it("HTTP 503 => offline (rojo)", () => {
    const error = new ApiHttpError("DB down", 503, "http://x/api/health", {});
    expect(deriveBackendStatus(undefined, error, false)).toBe("offline");
  });

  it("error de red => offline", () => {
    expect(deriveBackendStatus(undefined, new TypeError("fetch failed"), false)).toBe("offline");
  });

  it("cargando sin data ni error => healthy (optimista, evita flash rojo)", () => {
    expect(deriveBackendStatus(undefined, null, true)).toBe("healthy");
  });
});
