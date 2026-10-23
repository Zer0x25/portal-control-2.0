import { request as apiRequest, errorMessageOr, ApiHttpError } from "./apiClient";
import { authTokenStore } from "./authToken";
import { logger } from "../utils/logger";

export interface LoginResponse {
  userId: string;
  username: string;
  role: string;
  employeeId?: string;
  token?: string;
  mfaRequired?: boolean;
  mfaToken?: string;
  mustChangePassword?: boolean;
  message?: string;
}

export interface AuthService {
  login: (username: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;
  getToken: () => string | null;
  setToken: (token: string) => void;
  removeToken: () => void;
  getAuthHeader: () => HeadersInit;
  setupMFA: () => Promise<{ qrCode: string; secret: string }>;
  verifyMFASetup: (token: string) => Promise<{ message: string }>;
  validateMFACode: (mfaToken: string, code: string) => Promise<LoginResponse>;
  kioskVerifyPin: (
    employeeId: string,
    pin: string,
  ) => Promise<{ success: boolean; message: string; employeeName?: string }>;
}

/**
 * Servicio de autenticacion (spec 034, T14).
 *
 * Las llamadas pasan por `apiClient`, asi que heredan timeout, dedup y
 * `ApiHttpError` con status. **El contrato de error se preserva**:
 *
 * - `login`, `setupMFA`, `verifyMFASetup` y `validateMFACode` **lanzan** un
 *   error con el mensaje del backend (`data.message`) y, si el backend no lo
 *   trae, con el mensaje generico historico de cada metodo.
 * - `kioskVerifyPin` **devuelve** `{ success: false, message }` en vez de
 *   lanzar (el kiosk muestra el mensaje en pantalla).
 *
 * Los 3 endpoints anonimos (`/auth/login`, `/auth/mfa/validate`,
 * `/auth/kiosk-login`) no emiten eventos globales: un 401 por credencial
 * invalida no cierra la sesion. `/auth/mfa/setup` y `/auth/mfa/verify` si los
 * emiten (son parte de la sesion activa).
 */
class AuthServiceImpl implements AuthService {
  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const data = await apiRequest<LoginResponse>({
        method: "POST",
        url: "/api/auth/login",
        body: { username, password },
      });

      if (data.token) {
        this.setToken(data.token);
      }
      return data;
    } catch (error) {
      logger.error("Login error:", error);
      throw new Error(errorMessageOr(error, "Error en el inicio de sesión"), {
        cause: error,
      });
    }
  }

  async setupMFA(): Promise<{ qrCode: string; secret: string }> {
    try {
      return await apiRequest<{ qrCode: string; secret: string }>({
        method: "POST",
        url: "/api/auth/mfa/setup",
      });
    } catch (error) {
      throw new Error(errorMessageOr(error, "Error al configurar MFA"), { cause: error });
    }
  }

  async verifyMFASetup(token: string): Promise<{ message: string }> {
    try {
      return await apiRequest<{ message: string }>({
        method: "POST",
        url: "/api/auth/mfa/verify",
        body: { token },
      });
    } catch (error) {
      throw new Error(errorMessageOr(error, "Error al verificar MFA"), { cause: error });
    }
  }

  async validateMFACode(mfaToken: string, code: string): Promise<LoginResponse> {
    try {
      const data = await apiRequest<LoginResponse>({
        method: "POST",
        url: "/api/auth/mfa/validate",
        body: { mfaToken, code },
      });

      if (data.token) this.setToken(data.token);
      return data;
    } catch (error) {
      throw new Error(errorMessageOr(error, "Código MFA inválido"), { cause: error });
    }
  }

  async logout(): Promise<void> {
    this.removeToken();
    return Promise.resolve();
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  getToken(): string | null {
    return authTokenStore.getToken();
  }

  setToken(token: string): void {
    authTokenStore.setToken(token);
  }

  removeToken(): void {
    authTokenStore.removeToken();
  }

  getAuthHeader(): HeadersInit {
    return authTokenStore.getAuthHeader();
  }

  async kioskVerifyPin(
    employeeId: string,
    pin: string,
  ): Promise<{ success: boolean; message: string; employeeName?: string }> {
    try {
      const data = await apiRequest<{
        success: boolean;
        message: string;
        employeeName?: string;
        token?: string;
      }>({
        method: "POST",
        url: "/api/auth/kiosk-login",
        body: { employeeId, pin },
      });

      if (data.token) {
        this.setToken(data.token);
      }

      return data;
    } catch (error) {
      logger.error("Kiosk verify pin error:", error);
      // El kiosk no lanza: muestra el mensaje en pantalla. Un 4xx del backend
      // trae su propio mensaje ("PIN incorrecto"); un fallo de red no.
      if (error instanceof ApiHttpError) {
        return { success: false, message: errorMessageOr(error, "Error de verificación") };
      }
      return { success: false, message: "Error de conexión con el servidor" };
    }
  }
}

export const authService: AuthService = new AuthServiceImpl();
