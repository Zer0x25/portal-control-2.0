import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authService } from "../../services/authService";
import { authTokenStore } from "../../services/authToken";
import { server } from "../mocks/server";
import { http, HttpResponse } from "msw";

describe("authService sobre apiClient (spec 034 T14)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    authTokenStore.removeToken();
  });

  afterEach(() => {
    authTokenStore.removeToken();
    sessionStorage.clear();
    server.resetHandlers();
  });

  it("login guarda el token y devuelve la respuesta", async () => {
    server.use(
      http.post("http://localhost:4000/api/auth/login", () =>
        HttpResponse.json({ userId: "u1", username: "ana", role: "Administrador", token: "jwt-1" }),
      ),
    );

    const result = await authService.login("ana", "clave");

    expect(result.token).toBe("jwt-1");
    expect(authTokenStore.getToken()).toBe("jwt-1");
  });

  it("login lanza el mensaje del backend y no cierra la sesion (401 anonimo)", async () => {
    server.use(
      http.post("http://localhost:4000/api/auth/login", () =>
        HttpResponse.json({ message: "Credenciales invalidas" }, { status: 401 }),
      ),
    );
    const unauthorized = vi.fn();
    window.addEventListener("unauthorized", unauthorized);

    await expect(authService.login("ana", "mala")).rejects.toThrow("Credenciales invalidas");

    expect(unauthorized).not.toHaveBeenCalled();
    window.removeEventListener("unauthorized", unauthorized);
  });

  it("login usa el mensaje generico cuando el backend no lo trae", async () => {
    server.use(
      http.post("http://localhost:4000/api/auth/login", () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );

    await expect(authService.login("ana", "mala")).rejects.toThrow("Error en el inicio de sesión");
  });

  it("kioskVerifyPin devuelve { success: false, message } sin lanzar (401 anonimo)", async () => {
    server.use(
      http.post("http://localhost:4000/api/auth/kiosk-login", () =>
        HttpResponse.json({ message: "PIN incorrecto" }, { status: 401 }),
      ),
    );
    const unauthorized = vi.fn();
    window.addEventListener("unauthorized", unauthorized);

    const result = await authService.kioskVerifyPin("e1", "0000");

    expect(result).toEqual({ success: false, message: "PIN incorrecto" });
    expect(unauthorized).not.toHaveBeenCalled();
    window.removeEventListener("unauthorized", unauthorized);
  });

  it("kioskVerifyPin distingue el fallo de red del error del backend", async () => {
    server.use(http.post("http://localhost:4000/api/auth/kiosk-login", () => HttpResponse.error()));

    const result = await authService.kioskVerifyPin("e1", "0000");

    expect(result).toEqual({ success: false, message: "Error de conexión con el servidor" });
  });

  it("validateMFACode guarda el token y no cierra la sesion", async () => {
    server.use(
      http.post("http://localhost:4000/api/auth/mfa/validate", () =>
        HttpResponse.json({ userId: "u1", username: "ana", role: "Administrador", token: "jwt-2" }),
      ),
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
    server.use(
      http.post("http://localhost:4000/api/auth/mfa/setup", () =>
        HttpResponse.json({ message: "Sesion expirada" }, { status: 401 }),
      ),
      http.post("http://localhost:4000/api/auth/mfa/verify", () =>
        HttpResponse.json({ message: "Sesion expirada" }, { status: 401 }),
      ),
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
    let capturedAuth: string | null = null;
    server.use(
      http.post("http://localhost:4000/api/auth/mfa/setup", ({ request }) => {
        capturedAuth = request.headers.get("authorization");
        return HttpResponse.json({ qrCode: "qr", secret: "s3cret" });
      }),
    );

    await authService.setupMFA();

    expect(capturedAuth).toBe("Bearer jwt-3");
  });
});
