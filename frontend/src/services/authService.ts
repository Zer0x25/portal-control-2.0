import { apiClient } from "./apiClient";

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

class AuthServiceImpl implements AuthService {
  private readonly TOKEN_KEY = "authToken";

  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const data = (await apiClient.post("/api/auth/login" as never, {
        body: { username, password } as never,
        skipAuthEvents: true,
      })) as LoginResponse;

      if (data.token) {
        this.setToken(data.token);
      }
      return data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  async setupMFA(): Promise<{ qrCode: string; secret: string }> {
    return (await apiClient.post("/api/auth/mfa/setup" as never, {
      body: {} as never,
    })) as { qrCode: string; secret: string };
  }

  async verifyMFASetup(token: string): Promise<{ message: string }> {
    return (await apiClient.post("/api/auth/mfa/verify" as never, {
      body: { token } as never,
    })) as { message: string };
  }

  async validateMFACode(mfaToken: string, code: string): Promise<LoginResponse> {
    const data = (await apiClient.post("/api/auth/mfa/validate" as never, {
      body: { mfaToken, code } as never,
      skipAuthEvents: true,
    })) as LoginResponse;
    if (data.token) this.setToken(data.token);
    return data;
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
    return sessionStorage.getItem(this.TOKEN_KEY);
  }

  setToken(token: string): void {
    sessionStorage.setItem(this.TOKEN_KEY, token);
  }

  removeToken(): void {
    sessionStorage.removeItem(this.TOKEN_KEY);
  }

  getAuthHeader(): HeadersInit {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async kioskVerifyPin(
    employeeId: string,
    pin: string,
  ): Promise<{ success: boolean; message: string; employeeName?: string }> {
    try {
      const result = await apiClient.request<{
        success: boolean;
        message: string;
        token?: string;
        employeeName?: string;
      }>("/api/auth/kiosk-login", {
        method: "POST",
        body: { employeeId, pin },
        skipAuthEvents: true,
        mode: "result",
      });

      if (!result.ok) {
        const message =
          (result.data as { message?: string })?.message ||
          result.error?.message ||
          "Error de verificación";
        return { success: false, message };
      }

      const data = result.data;
      if (data.token) {
        this.setToken(data.token);
      }

      return data;
    } catch (error) {
      console.error("Kiosk verify pin error:", error);
      return { success: false, message: "Error de conexión con el servidor" };
    }
  }
}

export const authService: AuthService = new AuthServiceImpl();
