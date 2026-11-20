import { StateCreator } from "zustand";
import { User, UserRole } from "../../types/index";
import { AppState } from "../types";
import { STORAGE_KEYS, ROUTES } from "../../constants";
import { authService } from "../../services/authService";
import { wipeAllData } from "../../utils/indexedDB";
import { QUERY_CACHE_OWNER_KEY, purgePersistedQueryCache } from "../../lib/queryCache";
import { queryClient } from "../../lib/queryClient";

/**
 * Purga del cache persistido + en memoria (spec 032 AC2.1).
 *
 * Idempotente y limitada al cache de queries: nunca toca la base del offline
 * queue (`wipeAllData`), cuya cola de escritura es invariante.
 */
const resetPersistedQueryCache = async (ownerId: string | null): Promise<void> => {
  await purgePersistedQueryCache({ preserveRoots: ["employeesKiosk"] });
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== "employeesKiosk",
  });
  if (ownerId) {
    localStorage.setItem(QUERY_CACHE_OWNER_KEY, ownerId);
  } else {
    localStorage.removeItem(QUERY_CACHE_OWNER_KEY);
  }
};

const getEmployeeIdFromToken = (token?: string): string | undefined => {
  if (!token) return undefined;

  try {
    const rawSegment = token.split(".")[1] || "";
    if (!rawSegment) return undefined;
    const base64 = rawSegment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as { employeeId?: string | null };
    return payload.employeeId ?? undefined;
  } catch {
    return undefined;
  }
};

export interface AuthSlice {
  currentUser: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  mfaRequired: boolean;
  mfaToken: string | null;
  login: (username: string, password: string) => Promise<LoginResponse | User>;
  validateMFACode: (code: string) => Promise<User | null>;
  logout: () => Promise<void>;
  _verifyAuth: () => Promise<void>;
  _handleSuccessfulLogin: (
    loginResponse: LoginResponse,
    options?: { mfaVerified?: boolean },
  ) => Promise<User>;
  clearMustChangePassword: () => void;
  completeForcePasswordChange: () => Promise<void>;
  markMfaEnabled: () => void;
}

import { LoginResponse } from "../../services/authService";
import { logger } from "../../utils/logger";

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  isAuthLoading: true,
  mfaRequired: false,
  mfaToken: null,

  _verifyAuth: async () => {
    set({ isAuthLoading: true });
    const storedUser = sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (storedUser && authService.isAuthenticated()) {
      try {
        const rawUser = JSON.parse(storedUser) as User;
        if (!rawUser?.id) {
          throw new Error("Stored user missing id");
        }
        const user: User = {
          ...rawUser,
          role: (typeof rawUser.role === "string"
            ? rawUser.role.replace(/ /g, "_")
            : rawUser.role) as UserRole,
        };

        // AC2.1: si el cache persistido pertenece a otra cuenta, se purga
        // antes de hidratar para no exponer datos de un usuario previo.
        if (localStorage.getItem(QUERY_CACHE_OWNER_KEY) !== user.id) {
          await resetPersistedQueryCache(user.id);
        }

        set({ currentUser: user, isAuthenticated: true, isAuthLoading: false });

        if (!user.mustChangePassword) {
          // Re-trigger global sync to populate store from IDB or Server
          get()
            .initializeAppData()
            .catch((err) => {
              logger.error("Failed to initialize app data on session restore:", err);
            });
        }
        return;
      } catch (e) {
        logger.warn("Error parsing stored user:", e);
      }
    }
    sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    authService.removeToken();
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
      return await get()._handleSuccessfulLogin(loginResponse, { mfaVerified: true });
    } catch (error) {
      set({ isAuthLoading: false });
      throw error;
    }
  },

  _handleSuccessfulLogin: async (
    loginResponse: LoginResponse,
    options?: { mfaVerified?: boolean },
  ) => {
    const lastUserId = localStorage.getItem(STORAGE_KEYS.LAST_LOGGED_USER_ID);
    const isNewUser = lastUserId !== loginResponse.userId;

    if (isNewUser) {
      logger.warn("🔄 Nuevo usuario detectado. Limpiando caché local...");
      await wipeAllData();
      // AC2.1: el cache de queries persistido tambien cambia de dueño.
      await resetPersistedQueryCache(loginResponse.userId);
      localStorage.removeItem(STORAGE_KEYS.LAST_SYNC_TIMESTAMP);
      localStorage.setItem(STORAGE_KEYS.LAST_LOGGED_USER_ID, loginResponse.userId);
      set({ lastSyncTime: null });
    } else {
      localStorage.setItem(QUERY_CACHE_OWNER_KEY, loginResponse.userId);
    }

    const resolvedEmployeeId =
      loginResponse.employeeId ??
      getEmployeeIdFromToken(loginResponse.token) ??
      getEmployeeIdFromToken(authService.getToken() || undefined);

    const normalizedRole = (loginResponse.role?.replace(/ /g, "_") || "Usuario") as UserRole;

    const user: User = {
      id: loginResponse.userId,
      username: loginResponse.username,
      role: normalizedRole,
      employeeId: resolvedEmployeeId,
      isDeleted: false,
      lastModified: Date.now(),
      syncStatus: "synced",
      mustChangePassword: loginResponse.mustChangePassword === true,
      mfaEnabled: loginResponse.mfaEnabled ?? options?.mfaVerified === true,
    };

    if (user.mustChangePassword) {
      set({
        currentUser: user,
        isAuthenticated: true,
        isAuthLoading: false,
        mfaRequired: false,
        mfaToken: null,
        isInitialSync: false,
        currentSyncStep: "",
        syncProgress: 0,
        isSyncing: false,
      });
      sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      return user;
    }

    set({
      currentUser: user,
      isAuthenticated: true,
      isAuthLoading: false,
      mfaRequired: false,
      mfaToken: null,
    });
    sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));

    set({ isInitialSync: true }); // Trigger overlay immediately to prevent "ugly" gap
    // Do not block navigation on heavy app initialization; keep overlay visible while sync runs.
    get()
      .initializeAppData()
      .catch((err) => {
        logger.error("Failed to initialize app data after login:", err);
      });
    return user;
  },

  logout: async () => {
    set({
      currentUser: null,
      isAuthenticated: false,
      isAuthLoading: false,
      mfaRequired: false,
      mfaToken: null,
      isInitialSync: false,
      currentSyncStep: "",
      syncProgress: 0,
      isSyncing: false,
    });
    // Keep calling the service to clear backend session, but frontend log is removed
    await authService.logout().catch(() => {});

    // AC2.1: purga del cache persistido en logout (no toca la cola offline).
    await resetPersistedQueryCache(null);

    // No borramos LAST_SYNC_TIMESTAMP aquí para permitir sincronización delta si el mismo usuario vuelve a entrar.
    // La validación se hace en el login (si el ID cambia, se limpia todo).

    sessionStorage.clear();
    if (window.location.hash !== `#${ROUTES.LOGIN}`) {
      window.location.hash = `#${ROUTES.LOGIN}`;
    }
  },

  clearMustChangePassword: () => {
    const currentUser = get().currentUser;
    if (!currentUser?.mustChangePassword) return;

    const updatedUser = { ...currentUser, mustChangePassword: false };
    set({ currentUser: updatedUser });
    sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
  },

  completeForcePasswordChange: async () => {
    const currentUser = get().currentUser;
    if (!currentUser) return;

    if (currentUser.mustChangePassword) {
      const updatedUser = { ...currentUser, mustChangePassword: false };
      set({ currentUser: updatedUser });
      sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
    }

    await queryClient.invalidateQueries();
    await get().initializeAppData();
  },

  markMfaEnabled: () => {
    const currentUser = get().currentUser;
    if (!currentUser || currentUser.mfaEnabled) return;

    const updatedUser = { ...currentUser, mfaEnabled: true };
    set({ currentUser: updatedUser });
    sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
  },
});
