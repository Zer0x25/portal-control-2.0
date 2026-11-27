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
    authTokenStore.removeKioskToken();
    sessionStorage.clear();
    server.resetHandlers();
  });

  it("login guarda el token y devuelve la respuesta", async () => {
    server.use(
      http.post("http://localhost:4000/api/auth/login", () =>
        HttpResponse.json({
          userId: "u1",
          username: "ana",
          role: "Super_Administrador",
          token: "jwt-1",
        }),
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

    expect(result).toEqual({ success: false, message: "PIN incorrecto", status: 401 });
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
        HttpResponse.json({
          userId: "u1",
          username: "ana",
          role: "Super_Administrador",
          token: "jwt-2",
        }),
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

  it("logout envia POST /api/auth/logout con Bearer antes de limpiar authToken", async () => {
    authTokenStore.setToken("jwt-logout");
    let capturedAuth: string | null = null;
    let tokenPresentDuringRequest = false;
    server.use(
      http.post("http://localhost:4000/api/auth/logout", ({ request }) => {
        capturedAuth = request.headers.get("authorization");
        tokenPresentDuringRequest = authTokenStore.getToken() === "jwt-logout";
        return HttpResponse.json({ message: "ok" });
      }),
    );

    await authService.logout();

    expect(capturedAuth).toBe("Bearer jwt-logout");
    expect(tokenPresentDuringRequest).toBe(true);
    expect(authTokenStore.getToken()).toBeNull();
  });

  it("logout limpia authToken aunque el backend responda 500 o error de red", async () => {
    authTokenStore.setToken("jwt-err");
    server.use(
      http.post("http://localhost:4000/api/auth/logout", () =>
        HttpResponse.json({ message: "fail" }, { status: 500 }),
      ),
    );

    await expect(authService.logout()).resolves.toBeUndefined();
    expect(authTokenStore.getToken()).toBeNull();

    authTokenStore.setToken("jwt-net");
    server.use(http.post("http://localhost:4000/api/auth/logout", () => HttpResponse.error()));

    await expect(authService.logout()).resolves.toBeUndefined();
    expect(authTokenStore.getToken()).toBeNull();
  });

  it("kioskVerifyPin guarda token en kioskToken sin sobrescribir authToken y retorna mustChangePin/status", async () => {
    authTokenStore.setToken("portal-token");
    server.use(
      http.post("http://localhost:4000/api/auth/kiosk-login", () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          token: "kiosk-jwt",
          mustChangePin: true,
        }),
      ),
    );

    const res = await authService.kioskVerifyPin("e1", "2468");

    expect(res.success).toBe(true);
    expect(res.mustChangePin).toBe(true);
    expect(authTokenStore.getKioskToken()).toBe("kiosk-jwt");
    expect(authTokenStore.getToken()).toBe("portal-token");
  });

  it("kioskLogout envía POST /api/auth/logout con kioskToken y luego lo elimina", async () => {
    authTokenStore.setToken("portal-token");
    authTokenStore.setKioskToken("kiosk-logout-jwt");
    let capturedAuth: string | null = null;
    server.use(
      http.post("http://localhost:4000/api/auth/logout", ({ request }) => {
        capturedAuth = request.headers.get("authorization");
        return HttpResponse.json({ message: "ok" });
      }),
    );

    await authService.kioskLogout();

    expect(capturedAuth).toBe("Bearer kiosk-logout-jwt");
    expect(authTokenStore.getKioskToken()).toBeNull();
    expect(authTokenStore.getToken()).toBe("portal-token");
  });

  it("isAuthenticated valida vigencia base64url y rechaza tokens expirados o de Kiosk_Employee", () => {
    const encodeBase64Url = (obj: Record<string, unknown>) =>
      btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const pastExp = Math.floor(Date.now() / 1000) - 60;

    authTokenStore.setToken(`hdr.${encodeBase64Url({ exp: futureExp, role: "Usuario" })}.sig`);
    expect(authService.isAuthenticated()).toBe(true);

    authTokenStore.setToken(`hdr.${encodeBase64Url({ exp: pastExp, role: "Usuario" })}.sig`);
    expect(authService.isAuthenticated()).toBe(false);

    authTokenStore.setToken(
      `hdr.${encodeBase64Url({ exp: futureExp, role: "Kiosk_Employee" })}.sig`,
    );
    expect(authService.isAuthenticated()).toBe(false);
  });
});
