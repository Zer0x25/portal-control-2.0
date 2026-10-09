import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiClient, ApiHttpError } from "./apiClient";

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
