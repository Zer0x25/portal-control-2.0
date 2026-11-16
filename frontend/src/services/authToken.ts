/**
 * Almacen del token de sesion (spec 034, T14).
 *
 * Vive **fuera** de `authService` a proposito: `apiClient` necesita la
 * cabecera `Authorization` para cada peticion y `authService` usa el cliente
 * para sus llamadas. Si el cliente importara al service y el service al
 * cliente, la importacion seria circular.
 *
 * `authService` mantiene su API publica (`getToken`, `setToken`,
 * `removeToken`, `getAuthHeader`) delegando en este almacen.
 */
const TOKEN_KEY = "authToken";
const KIOSK_TOKEN_KEY = "kioskToken";

export type AuthTokenScope = "portal" | "kiosk";

export const authTokenStore = {
  getToken: (): string | null => sessionStorage.getItem(TOKEN_KEY),

  setToken: (token: string): void => {
    sessionStorage.setItem(TOKEN_KEY, token);
  },

  removeToken: (): void => {
    sessionStorage.removeItem(TOKEN_KEY);
  },

  getAuthHeader: (): HeadersInit => {
    const token = authTokenStore.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  getKioskToken: (): string | null => sessionStorage.getItem(KIOSK_TOKEN_KEY),

  setKioskToken: (token: string): void => {
    sessionStorage.setItem(KIOSK_TOKEN_KEY, token);
  },

  removeKioskToken: (): void => {
    sessionStorage.removeItem(KIOSK_TOKEN_KEY);
  },

  getKioskAuthHeader: (): HeadersInit => {
    const token = authTokenStore.getKioskToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  getAuthHeaderForScope: (scope: AuthTokenScope = "portal"): HeadersInit =>
    scope === "kiosk" ? authTokenStore.getKioskAuthHeader() : authTokenStore.getAuthHeader(),
};
