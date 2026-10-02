import { API_BASE_URL } from "./apiBase";

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
  private readonly API_URL = API_BASE_URL;

  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`${this.API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error en el inicio de sesión");
      }

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
    const response = await fetch(`${this.API_URL}/auth/mfa/setup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.getAuthHeader() as Record<string, string>),
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Error al configurar MFA");
    return data;
  }

  async verifyMFASetup(token: string): Promise<{ message: string }> {
    const response = await fetch(`${this.API_URL}/auth/mfa/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.getAuthHeader() as Record<string, string>),
      },
      body: JSON.stringify({ token }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Error al verificar MFA");
    return data;
  }

  async validateMFACode(mfaToken: string, code: string): Promise<LoginResponse> {
    const response = await fetch(`${this.API_URL}/auth/mfa/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mfaToken, code }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Código MFA inválido");
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
      const response = await fetch(`${this.API_URL}/auth/kiosk-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ employeeId, pin }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, message: data.message || "Error de verificación" };
      }

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
