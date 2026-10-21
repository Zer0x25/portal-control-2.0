import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { authService } from "../../services/authService";
import { authTokenStore } from "../../services/authToken";
import { jsonResponse } from "../helpers/mockResponse";

/**
 * Spec 034, T14: `authService` migra a `apiClient` conservando su contrato
 * de error (`login` **lanza**, `kioskVerifyPin` **devuelve**) y la politica
 * de eventos (los 3 endpoints anonimos no cierran la sesion).
 */
describe("authService sobre apiClient (spec 034 T14)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("login guarda el token y devuelve la respuesta", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ userId: "u1", username: "ana", role: "Administrador", token: "jwt-1" }),
    );

    const result = await authService.login("ana", "clave");

    expect(result.token).toBe("jwt-1");
    expect(authTokenStore.getToken()).toBe("jwt-1");
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ username: "ana", password: "clave" });
  });

  it("login lanza el mensaje del backend y no cierra la sesion (401 anonimo)", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Credenciales invalidas" }, 401));
    const unauthorized = vi.fn();
    window.addEventListener("unauthorized", unauthorized);

    await expect(authService.login("ana", "mala")).rejects.toThrow("Credenciales invalidas");

    expect(unauthorized).not.toHaveBeenCalled();
    window.removeEventListener("unauthorized", unauthorized);
  });

  it("login usa el mensaje generico cuando el backend no lo trae", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, 500));

    await expect(authService.login("ana", "mala")).rejects.toThrow("Error en el inicio de sesión");
  });

  it("kioskVerifyPin devuelve { success: false, message } sin lanzar (401 anonimo)", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "PIN incorrecto" }, 401));
    const unauthorized = vi.fn();
    window.addEventListener("unauthorized", unauthorized);

    const result = await authService.kioskVerifyPin("e1", "0000");

    expect(result).toEqual({ success: false, message: "PIN incorrecto" });
    expect(unauthorized).not.toHaveBeenCalled();
    window.removeEventListener("unauthorized", unauthorized);
  });

  it("kioskVerifyPin distingue el fallo de red del error del backend", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));

    const result = await authService.kioskVerifyPin("e1", "0000");

    expect(result).toEqual({ success: false, message: "Error de conexión con el servidor" });
  });

  it("validateMFACode guarda el token y no cierra la sesion", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ userId: "u1", username: "ana", role: "Administrador", token: "jwt-2" }),
    );
    const unauthorized = vi.fn();
    window.addEventListener("unauthorized", unauthorized);

    const result = await authService.validateMFACode("mfa-token", "123456");

    expect(result.token).toBe("jwt-2");
    expect(authTokenStore.getToken()).toBe("jwt-2");
    expect(unauthorized).not.toHaveBeenCalled();
    window.removeEventListener("unauthorized", unauthorized);
  });

  it("setupMFA y verifyMFASetup si emiten el evento unauthorized (401)", async () => {
    // Una `Response` solo se puede leer una vez: se crea una por llamada.
    vi.mocked(fetch).mockImplementation(async () =>
      jsonResponse({ message: "Sesion expirada" }, 401),
    );
    const unauthorized = vi.fn();
    window.addEventListener("unauthorized", unauthorized);

    await expect(authService.setupMFA()).rejects.toThrow("Sesion expirada");
    expect(unauthorized).toHaveBeenCalledTimes(1);

    await expect(authService.verifyMFASetup("token")).rejects.toThrow("Sesion expirada");
    expect(unauthorized).toHaveBeenCalledTimes(2);

    window.removeEventListener("unauthorized", unauthorized);
  });

  it("las cabeceras de autorizacion viajan en las peticiones con sesion", async () => {
    authTokenStore.setToken("jwt-3");
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ qrCode: "qr", secret: "s3cret" }));

    await authService.setupMFA();

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer jwt-3");
  });
});
