import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { authTokenStore } from "../../../services/authToken";
import { useAuditLogDownload } from "../../../features/governance/hooks/useAuditLogDownload";
import { server } from "../../mocks/server";

const { triggerBrowserDownloadMock } = vi.hoisted(() => ({
  triggerBrowserDownloadMock: vi.fn(),
}));

vi.mock("../../../utils/triggerBrowserDownload", () => ({
  triggerBrowserDownload: (...args: unknown[]) => triggerBrowserDownloadMock(...args),
}));

describe("useAuditLogDownload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authTokenStore.setToken("audit-jwt");
  });

  afterEach(() => {
    authTokenStore.removeToken();
    server.resetHandlers();
  });

  it("descarga logs de auditoria con Bearer sin exponer token en URL", async () => {
    let capturedAuth: string | null = null;
    let capturedUrl = "";
    server.use(
      http.get("http://localhost:4000/api/audit-logs/export", ({ request }) => {
        capturedAuth = request.headers.get("authorization");
        capturedUrl = request.url;
        return new HttpResponse(new Blob(["<logs/>"], { type: "application/xml" }), {
          status: 200,
          headers: { "content-disposition": 'attachment; filename="logs.xml"' },
        });
      }),
    );

    const { result } = renderHook(() => useAuditLogDownload());

    await act(async () => {
      await result.current("2026-03-01", "2026-03-05", "xml");
    });

    expect(capturedAuth).toBe("Bearer audit-jwt");
    expect(capturedUrl).toContain("startDate=2026-03-01");
    expect(capturedUrl).toContain("endDate=2026-03-05");
    expect(capturedUrl).toContain("format=xml");
    expect(capturedUrl).not.toContain("token=");
    expect(triggerBrowserDownloadMock).toHaveBeenCalledWith(expect.any(Blob), "logs.xml");
  });
});
