import { StateCreator } from "zustand";
import { User, UserRole } from "../../types/index";
import { AppState } from "../types";
import { STORAGE_KEYS, ROUTES } from "../../constants";
import { authService } from "../../services/authService";
import { wipeAllData } from "../../utils/indexedDB";

const getEmployeeIdFromToken = (token?: string): string | undefined => {
  if (!token) return undefined;

  try {
    const payload = JSON.parse(atob(token.split(".")[1] || "")) as { employeeId?: string | null };
    return payload.employeeId ?? undefined;
  } catch {
    return undefined;
  }
};

export interface AuthSlice {
  currentUser: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  isForcePasswordChangeModalOpen: boolean;
  mfaRequired: boolean;
  mfaToken: string | null;
  login: (username: string, password: string) => Promise<LoginResponse | User>;
  validateMFACode: (code: string) => Promise<User | null>;
  logout: () => void;
  _verifyAuth: () => Promise<void>;
  _handleSuccessfulLogin: (loginResponse: LoginResponse) => Promise<User>;
  closeForcePasswordChangeModal: () => void;
}

import { LoginResponse } from "../../services/authService";

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  isAuthLoading: true,
  isForcePasswordChangeModalOpen: false,
  mfaRequired: false,
  mfaToken: null,

  _verifyAuth: async () => {
    set({ isAuthLoading: true });
    const storedUser = sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        set({ currentUser: user, isAuthenticated: true, isAuthLoading: false });

        // Re-trigger global sync to populate store from IDB or Server
        get()
          .initializeAppData()
          .catch((err) => {
            console.error("Failed to initialize app data on session restore:", err);
          });
        return;
      } catch (e) {
        console.warn("Error parsing stored user:", e);
      }
    }
    set({ currentUser: null, isAuthenticated: false, isAuthLoading: false });
  },

  login: async (username, password) => {
    set({ isAuthLoading: true });
    const overlayTimer = setTimeout(() => {
      set({
        isInitialSync: true,
        currentSyncStep: "Autenticando acceso...",
        syncProgress: 5,
      });
    }, 300);

    try {
      const loginResponse = await authService.login(username, password);
      clearTimeout(overlayTimer);

      if (loginResponse.mfaRequired) {
        set({
          mfaRequired: true,
          mfaToken: loginResponse.mfaToken || null,
          isAuthLoading: false,
          isInitialSync: false,
          currentSyncStep: "",
          syncProgress: 0,
        });
        return loginResponse;
      }

      // Credentials are valid: show the transition overlay immediately.
      set({
        isInitialSync: true,
        currentSyncStep: "Autenticando acceso...",
        syncProgress: 5,
      });

      return await get()._handleSuccessfulLogin(loginResponse);
    } catch (error) {
      clearTimeout(overlayTimer);
      const errorMessage = error instanceof Error ? error.message : "Credenciales inválidas";
      set({
        isAuthLoading: false,
        isInitialSync: false,
        currentSyncStep: "",
        syncProgress: 0,
      });
      throw new Error(errorMessage, { cause: error });
    }
  },

  validateMFACode: async (code: string) => {
    const { mfaToken } = get();
    if (!mfaToken) throw new Error("MFA Token no encontrado");

    set({ isAuthLoading: true });
    try {
      const loginResponse = await authService.validateMFACode(mfaToken, code);
      return await get()._handleSuccessfulLogin(loginResponse);
    } catch (error) {
      set({ isAuthLoading: false });
      throw error;
    }
  },

  _handleSuccessfulLogin: async (loginResponse: LoginResponse) => {
    const lastUserId = localStorage.getItem(STORAGE_KEYS.LAST_LOGGED_USER_ID);
    const isNewUser = lastUserId !== loginResponse.userId;

    if (isNewUser) {
      console.warn("🔄 Nuevo usuario detectado. Limpiando caché local...");
      await wipeAllData();
      localStorage.removeItem(STORAGE_KEYS.LAST_SYNC_TIMESTAMP);
      localStorage.setItem(STORAGE_KEYS.LAST_LOGGED_USER_ID, loginResponse.userId);
    }

    const resolvedEmployeeId =
      loginResponse.employeeId ??
      getEmployeeIdFromToken(loginResponse.token) ??
      getEmployeeIdFromToken(authService.getToken() || undefined);

    const user: User = {
      id: loginResponse.userId,
      username: loginResponse.username,
      role: loginResponse.role as UserRole,
      employeeId: resolvedEmployeeId,
      isDeleted: false,
      lastModified: Date.now(),
      syncStatus: "synced",
    };

    set({
      currentUser: user,
      isAuthenticated: true,
      isAuthLoading: false,
      mfaRequired: false,
      mfaToken: null,
      // Spec 002 H-06: el backend indica contraseña por defecto pendiente.
      isForcePasswordChangeModalOpen: loginResponse.mustChangePassword === true,
    });
    sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));

    set({ isInitialSync: true }); // Trigger overlay immediately to prevent "ugly" gap
    // Do not block navigation on heavy app initialization; keep overlay visible while sync runs.
    get()
      .initializeAppData()
      .catch((err) => {
        console.error("Failed to initialize app data after login:", err);
      });
    return user;
  },

  logout: async () => {
    set({
      currentUser: null,
      isAuthenticated: false,
      isInitialSync: false,
      currentSyncStep: "",
      syncProgress: 0,
      isSyncing: false,
    });
    // Keep calling the service to clear backend session, but frontend log is removed
    await authService.logout().catch(() => {});

    // No borramos LAST_SYNC_TIMESTAMP aquí para permitir sincronización delta si el mismo usuario vuelve a entrar.
    // La validación se hace en el login (si el ID cambia, se limpia todo).

    sessionStorage.clear();
    window.location.href = ROUTES.LOGIN; // Redirección limpia
  },

  closeForcePasswordChangeModal: () => {
    set({ isForcePasswordChangeModalOpen: false });
  },
});
