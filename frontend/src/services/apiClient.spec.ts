import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  apiClient,
  ApiHttpError,
  request,
  resetRateLimitEventLockForTests,
  type BinaryResponse,
} from "./apiClient";

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

describe("apiClient hardening (Fase 1)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ ok: true }, 200)),
    );
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
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

  it("dispara evento unauthorized en 401", async () => {
    const listener = vi.fn();
    window.addEventListener("unauthorized", listener);
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: "No auth" }, 401));
    await apiClient
      .get("/api/users" as never, { retry: false, dedup: false })
      .catch(() => undefined);
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener("unauthorized", listener);
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
});

/**
 * Spec 034, Fase A (AC1, AC2, AC3, AC4).
 *
 * - El retry de transporte tiene un unico dueño: `apiClient`.
 * - Los 4xx no transitorios (400/401/403/404/409/422) no se reintentan.
 * - Un fallo nunca cuesta mas de 3 peticiones HTTP.
 * - Los endpoints de autenticacion anonima no emiten eventos globales.
 */
describe("apiClient (spec 034 Fase A)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ ok: true }, 200)),
    );
    sessionStorage.clear();
    resetRateLimitEventLockForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const expectNoRetry = async (status: number): Promise<void> => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Error" }, status));
    await apiClient.get("/api/users" as never, { dedup: false }).catch(() => undefined);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  };

  it("no reintenta un 403 ni un 404", async () => {
    await expectNoRetry(403);
    vi.mocked(fetch).mockClear();
    await expectNoRetry(404);
  });

  it("no reintenta un 400, un 409 ni un 422", async () => {
    await expectNoRetry(400);
    vi.mocked(fetch).mockClear();
    await expectNoRetry(409);
    vi.mocked(fetch).mockClear();
    await expectNoRetry(422);
  });

  it("reintenta un 500 hasta 2 veces (3 peticiones como maximo)", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Error" }, 500));
    await apiClient.get("/api/users" as never, { dedup: false }).catch(() => undefined);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);
  }, 10000);

  it("reintenta un 503 y respeta el Retry-After", async () => {
    // `Retry-After: 0.05` son 50 ms: suficiente para observar el retraso sin
    // alargar la suite (el limite del cliente es 5 s).
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ message: "Busy" }, 503, { "Retry-After": "0.05" }),
    );
    await apiClient.get("/api/users" as never, { dedup: false }).catch(() => undefined);
    const delays = setTimeoutSpy.mock.calls.map((call) => call[1]);
    expect(delays).toContain(50);
    // 1 intento inicial + 2 reintentos: nunca mas de 3 peticiones por fallo.
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);
  }, 10000);

  it("usa un timeout por defecto de 15 s", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ok: true }, 200));
    await apiClient.get("/api/users" as never, { dedup: false });
    expect(timeoutSpy).toHaveBeenCalledWith(15000);
  });

  it("cancela la peticion al agotarse el timeout", async () => {
    // Todos los intentos abortan: el error final es un AbortError.
    vi.mocked(fetch).mockImplementation(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );
    const error = await apiClient
      .get("/api/users" as never, { timeoutMs: 30, dedup: false })
      .catch((e: unknown) => e);
    expect((error as Error).name).toBe("AbortError");
  }, 10000);

  it("compone el timeout con la senal del llamante", async () => {
    const controller = new AbortController();
    vi.mocked(fetch).mockImplementationOnce(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );
    const promise = apiClient
      .get("/api/users" as never, { signal: controller.signal, dedup: false })
      .catch((e: unknown) => e);
    controller.abort();
    const error = await promise;
    expect((error as Error).name).toBe("AbortError");
  });

  it("emite el evento rate_limited una sola vez por respuesta 429", async () => {
    const listener = vi.fn();
    window.addEventListener("rate_limited", listener);
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Too many" }, 429));
    await apiClient
      .get("/api/users" as never, { retry: false, dedup: false })
      .catch(() => undefined);
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener("rate_limited", listener);
  });

  it("no emite unauthorized ni rate_limited en /auth/login", async () => {
    const unauthorized = vi.fn();
    const rateLimited = vi.fn();
    window.addEventListener("unauthorized", unauthorized);
    window.addEventListener("rate_limited", rateLimited);
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Credenciales invalidas" }, 401));
    await apiClient.post("/api/auth/login" as never, { body: {} as never }).catch(() => undefined);
    expect(unauthorized).not.toHaveBeenCalled();
    expect(rateLimited).not.toHaveBeenCalled();
    window.removeEventListener("unauthorized", unauthorized);
    window.removeEventListener("rate_limited", rateLimited);
  });

  it("tampoco los emite en /auth/mfa/validate ni en /auth/kiosk-login", async () => {
    const unauthorized = vi.fn();
    window.addEventListener("unauthorized", unauthorized);
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Codigo invalido" }, 401));
    await apiClient
      .post("/api/auth/mfa/validate" as never, { body: {} as never })
      .catch(() => undefined);
    await apiClient
      .post("/api/auth/kiosk-login" as never, { body: {} as never })
      .catch(() => undefined);
    expect(unauthorized).not.toHaveBeenCalled();
    window.removeEventListener("unauthorized", unauthorized);
  });

  it("mantiene el evento unauthorized en /auth/mfa/setup (exige sesion previa)", async () => {
    const unauthorized = vi.fn();
    window.addEventListener("unauthorized", unauthorized);
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "No auth" }, 401));
    await apiClient
      .post("/api/auth/mfa/setup" as never, { body: {} as never })
      .catch(() => undefined);
    expect(unauthorized).toHaveBeenCalledTimes(1);
    window.removeEventListener("unauthorized", unauthorized);
  });

  it("devuelve el binario sin corromperlo y lee el Content-Disposition", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": 'attachment; filename="reporte.pdf"',
        },
      }),
    );
    const result = (await apiClient.get("/api/export/report-pdf" as never, {
      responseType: "binary",
      dedup: false,
    })) as unknown as BinaryResponse;
    expect(result.filename).toBe("reporte.pdf");
    expect(result.blob).toBeInstanceOf(Blob);
    expect(await result.blob.text()).toBe("%PDF");
  });

  it("envia FormData sin Content-Type manual (lo fija el navegador)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ok: true }, 200));
    const form = new FormData();
    form.append("file", new Blob(["x"]), "logo.png");
    await apiClient.post("/api/config/brand-logo" as never, { body: form as never });
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(init.body).toBe(form);
    expect(new Headers(init.headers).get("content-type")).toBeNull();
  });

  it("soporta PATCH", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ok: true }, 200));
    await apiClient.patch("/api/shift-reports/{id}" as never, {
      body: {} as never,
      path: { id: "1" } as never,
    });
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("PATCH");
  });

  it("devuelve un resultado tipado con status cuando errorMode es result", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Sin logo" }, 404));
    const result = await request<{ url: string }>({
      method: "GET",
      url: "/api/config/brand-logo",
      errorMode: "result",
      dedup: false,
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    expect(result.error).toBeInstanceOf(ApiHttpError);
  });
});
