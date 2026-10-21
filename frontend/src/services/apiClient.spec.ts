import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiClient, ApiHttpError, resetRateLimitLock, extractFilename } from "./apiClient";

function jsonResponse(
  body: unknown,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("apiClient hardening & regression test suite (AC1, AC2, AC3, AC4)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ ok: true }, 200)),
    );
    sessionStorage.clear();
    resetRateLimitLock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    resetRateLimitLock();
  });

  it("preserva status y message del servidor en ApiHttpError", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: "No encontrado" }, 404));
    const error = await apiClient.get("/api/users" as never).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiHttpError);
    expect((error as ApiHttpError).status).toBe(404);
    expect((error as Error).message).toBe("No encontrado");
  });

  it("propaga errorData.error cuando no hay message", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "Fallo interno" }, 500, {}));
    const error = await apiClient
      .get("/api/users" as never, { retry: false, dedup: false })
      .catch((e: unknown) => e);
    expect((error as ApiHttpError).status).toBe(500);
    expect((error as Error).message).toBe("Fallo interno");
  });

  it("403 y 404 NO se reintentan (exactamente 1 llamada HTTP)", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Forbidden" }, 403));
    await apiClient.get("/api/forbidden" as never, { dedup: false }).catch(() => undefined);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);

    vi.mocked(fetch).mockClear();
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Not Found" }, 404));
    await apiClient.get("/api/not-found" as never, { dedup: false }).catch(() => undefined);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("400, 409 y 422 NO se reintentan (exactamente 1 llamada HTTP)", async () => {
    for (const status of [400, 409, 422]) {
      vi.mocked(fetch).mockClear();
      vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: `Error ${status}` }, status));
      await apiClient.get("/api/client-error" as never, { dedup: false }).catch(() => undefined);
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    }
  });

  it("500 y 503 sí se reintentan (máx. 2 reintentos = 3 llamadas HTTP en total, nunca más de 3)", async () => {
    vi.mocked(fetch).mockClear();
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Server error" }, 500));
    await apiClient.get("/api/server-error" as never, { dedup: false }).catch(() => undefined);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);

    vi.mocked(fetch).mockClear();
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Service unavailable" }, 503));
    await apiClient.get("/api/unavailable" as never, { dedup: false }).catch(() => undefined);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);
  });

  it("reintenta GET en 503 y luego tiene éxito", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ message: "Busy" }, 503))
      .mockResolvedValueOnce(jsonResponse({ data: [1] }, 200));
    const result = (await apiClient.get("/api/users" as never, {
      dedup: false,
    })) as { data: number[] };
    expect(result.data).toEqual([1]);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it("respeta Retry-After numérico de cabecera en 429", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ message: "Rate limit" }, 429, { "Retry-After": "1" }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }, 200));

    const result = await apiClient.get("/api/test-retry-after" as never, { dedup: false });
    expect(result).toEqual({ ok: true });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it("emite el evento rate_limited una sola vez y lock de 5s evita tormenta", async () => {
    const rateLimitedListener = vi.fn();
    window.addEventListener("rate_limited", rateLimitedListener);

    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ message: "Rate limit" }, 429, { "Retry-After": "0" }),
    );

    // Call two requests sequentially or concurrently
    await apiClient.get("/api/test-429-1" as never, { dedup: false }).catch(() => undefined);
    await apiClient.get("/api/test-429-2" as never, { dedup: false }).catch(() => undefined);

    // Should only dispatch rate_limited once due to 5s anti-storm lock
    expect(rateLimitedListener).toHaveBeenCalledTimes(1);

    window.removeEventListener("rate_limited", rateLimitedListener);
  });

  it("suprime rate_limited y unauthorized en endpoints de autenticación anónima (/auth/login, /auth/mfa/validate, /auth/kiosk-login)", async () => {
    const unauthListener = vi.fn();
    const rateLimitedListener = vi.fn();
    window.addEventListener("unauthorized", unauthListener);
    window.addEventListener("rate_limited", rateLimitedListener);

    // /auth/login with 401
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: "Invalid credentials" }, 401));
    await apiClient.post("/api/auth/login" as never, { body: {} as never }).catch(() => undefined);
    expect(unauthListener).not.toHaveBeenCalled();

    // /auth/mfa/validate with 401
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: "Invalid code" }, 401));
    await apiClient
      .post("/api/auth/mfa/validate" as never, { body: {} as never })
      .catch(() => undefined);
    expect(unauthListener).not.toHaveBeenCalled();

    // /auth/kiosk-login with 401
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: "Invalid PIN" }, 401));
    await apiClient
      .post("/api/auth/kiosk-login" as never, { body: {} as never })
      .catch(() => undefined);
    expect(unauthListener).not.toHaveBeenCalled();

    // /auth/login with 429
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: "Too many attempts" }, 429));
    await apiClient.post("/api/auth/login" as never, { body: {} as never }).catch(() => undefined);
    expect(rateLimitedListener).not.toHaveBeenCalled();

    window.removeEventListener("unauthorized", unauthListener);
    window.removeEventListener("rate_limited", rateLimitedListener);
  });

  it("SÍ dispara unauthorized en 401 para /auth/mfa/setup y /auth/mfa/verify", async () => {
    const unauthListener = vi.fn();
    window.addEventListener("unauthorized", unauthListener);

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: "Session expired" }, 401));
    await apiClient
      .get("/api/auth/mfa/setup" as never, { dedup: false, retry: false })
      .catch(() => undefined);
    expect(unauthListener).toHaveBeenCalledTimes(1);

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: "Session expired" }, 401));
    await apiClient
      .post("/api/auth/mfa/verify" as never, { body: {} as never })
      .catch(() => undefined);
    expect(unauthListener).toHaveBeenCalledTimes(2);

    window.removeEventListener("unauthorized", unauthListener);
  });

  it("no reintenta POST en 500 (no idempotente)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: "Error" }, 500));
    await apiClient
      .post("/api/users" as never, { body: { name: "x" } as never })
      .catch(() => undefined);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("dedupa GETs concurrentes idénticos en un solo fetch", async () => {
    let resolveFetch: ((r: Response) => void) | null = null;
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const first = apiClient.get("/api/users" as never);
    const second = apiClient.get("/api/users" as never);
    resolveFetch?.(jsonResponse({ data: [] }, 200));
    const [a, b] = await Promise.all([first, second]);
    expect(a).toEqual({ data: [] });
    expect(b).toEqual({ data: [] });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("retorna undefined en 204 sin cuerpo", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));
    const result = await apiClient.get("/api/users" as never, { retry: false, dedup: false });
    expect(result).toBeUndefined();
  });

  it("ejecuta PATCH correctamente", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ updated: true }, 200));
    const result = await apiClient.patch("/api/reports/123" as never, {
      body: { status: "RESOLVED" } as never,
    });
    expect(result).toEqual({ updated: true });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    const [calledUrl, init] = vi.mocked(fetch).mock.calls[0];
    expect(init?.method).toBe("PATCH");
    expect(calledUrl).toContain("/api/reports/123");
  });

  it("envía FormData SIN Content-Type manual (para que el navegador defina el boundary multipart)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ uploaded: true }, 200));
    const formData = new FormData();
    formData.append("file", new Blob(["test"]), "test.csv");

    await apiClient.post("/api/import" as never, {
      body: formData,
    });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBeUndefined();
    expect(headers["content-type"]).toBeUndefined();
    expect(init?.body).toBe(formData);
  });

  it("modo respuesta binaria devuelve { blob, headers, filename } y extrae filename de Content-Disposition", async () => {
    const pdfBlob = new Blob(["%PDF-1.4 binary content"], { type: "application/pdf" });
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(pdfBlob, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="reporte_2026.pdf"',
        },
      }),
    );

    const result = await apiClient.blob("/api/export/report-pdf");
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.filename).toBe("reporte_2026.pdf");
    expect(result.headers.get("Content-Type")).toBe("application/pdf");
  });

  it("request con mode: 'result' devuelve { ok: false, status, error } en 404 sin lanzar excepción", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: "No logo" }, 404));
    const result = await apiClient.request("/api/brand-logo", {
      mode: "result",
      retry: false,
      dedup: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
      expect(result.error).toBeInstanceOf(ApiHttpError);
      expect(result.error.status).toBe(404);
    }
  });

  it("extractFilename decodifica correctamente formatos UTF-8 y estándar", () => {
    expect(extractFilename('attachment; filename="test_file.xlsx"')).toBe("test_file.xlsx");
    expect(extractFilename("attachment; filename*=UTF-8''Reporte%20Asistencia.pdf")).toBe(
      "Reporte Asistencia.pdf",
    );
    expect(extractFilename(null, "default.pdf")).toBe("default.pdf");
  });
});
