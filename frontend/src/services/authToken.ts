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
};
