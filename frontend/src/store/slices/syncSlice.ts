import { StateCreator } from "zustand";
import { SyncState, DailyTimeRecord } from "../../types/index";
import { AppState } from "../types";
import { timeRecordService } from "../../services/timeRecordService";
import { configService } from "../../services/configService";
import { idbIsStoreEmpty, STORES, wipeAllData } from "../../utils/indexedDB";

export interface SyncSlice {
  syncState: SyncState;
  lastSyncTime: number | null;
  syncProgress: number;
  isInitialSync: boolean;
  currentSyncStep: string;
  isSyncing: boolean;
  runSync: () => Promise<void>;
  initializeAppData: () => Promise<void>;
  validateInstanceId: () => Promise<boolean>;
  conflicts: unknown[];
  bulkAddRecords: (records: DailyTimeRecord[]) => Promise<boolean>;
}

export const createSyncSlice: StateCreator<AppState, [], [], SyncSlice> = (set, get) => ({
  syncState: "success",
  lastSyncTime: Number(localStorage.getItem("lastSyncTime")) || null,
  syncProgress: 0,
  isInitialSync: false,
  currentSyncStep: "",
  isSyncing: false,

  runSync: async () => {
    if (get().isSyncing) {
      console.warn("Sync already in progress, skipping...");
      return;
    }

    const { lastSyncTime, currentUser, addToast } = get();
    const syncUserId = currentUser?.id ?? null;
    const isInitial = !lastSyncTime;

    const isSessionStable = () => get().currentUser?.id === syncUserId;

    // Only trigger visual syncing state if it's the initial load
    if (isInitial) {
      set({
        syncState: "syncing",
        syncProgress: 0,
        isInitialSync: true,
      });
    }

    const now = Date.now();
    let since = lastSyncTime;
    const role = currentUser?.role;

    try {
      set({ isSyncing: true });

      if (!isSessionStable()) {
        return;
      }

      // 1. Smart Cache Check: If critical stores are empty, force a full sync regardless of lastSyncTime
      const isCacheEmpty = await (async () => {
        const [empEmpty, userEmpty] = await Promise.all([
          idbIsStoreEmpty(STORES.EMPLOYEES),
          idbIsStoreEmpty(STORES.USERS),
        ]);
        return empEmpty && userEmpty;
      })();

      if (isCacheEmpty && since) {
        console.warn("⚠️ Cache local vacía detectada. Forzando sincronización completa...");
        since = null;
        set({ isInitialSync: true, syncProgress: 0 });
      }

      if (!since) {
        console.warn("Iniciando sincronización inicial completa...");
      } else {
        console.warn(
          `Iniciando sincronización delta desde: ${since ? new Date(since).toISOString() : "inicio"}`,
        );
      }

      const steps = [
        {
          name: "Usuarios",
          action: () => get().loadUsers(),
          skip: role === "Usuario",
        },
        {
          name: "Empleados",
          action: () => get().loadEmployees(),
        },
        {
          name: "Configuraciones",
          action: () => get().loadConfigData(),
        },
        { name: "Horarios", action: () => get().loadShiftData() },
        {
          name: "Medidores",
          action: () => get().loadMeterData(),
          skip: role === "Usuario",
        },
        {
          name: "Notificaciones",
          action: () => get().loadNotifications(),
        },
      ];

      for (let i = 0; i < steps.length; i++) {
        if (!isSessionStable()) {
          console.warn("[Sync] Session changed during sync. Aborting current synchronization.");
          return;
        }

        const step = steps[i];
        if (step.skip) continue;

        if (isInitial) {
          set({
            currentSyncStep: `Sincronizando ${step.name}...`,
            syncProgress: Math.round((i / steps.length) * 100),
          });
        }

        await step.action();
      }

      localStorage.setItem("lastSyncTime", now.toString());

      if (!isSessionStable()) {
        console.warn("[Sync] Session changed before final sync commit. Skipping state update.");
        return;
      }

      set({
        syncState: "success",
        lastSyncTime: now,
        isInitialSync: false,
        currentSyncStep: isInitial ? "Completado" : get().currentSyncStep,
        syncProgress: isInitial ? 100 : get().syncProgress,
      });
      console.warn("Sincronización completada con éxito.");
    } catch (error) {
      console.error("Error en sincronización:", error);
      if (isInitial && isSessionStable()) {
        set({ syncState: "error", isInitialSync: false });
        addToast("Error durante la sincronización inicial de datos.", "error");
      }
    } finally {
      set({ isSyncing: false, isInitialSync: false }); // Always clear initial sync to prevent UI blocks
    }
  },

  initializeAppData: async () => {
    const state = get();
    if (!state.currentUser) return;

    if (state.isSyncing) {
      console.warn("[Sync] App already initializing/syncing, skipping initializeAppData.");
      return;
    }

    console.warn("Inicializando aplicación...");

    try {
      // Validar instancia de DB antes de sincronizar
      const isConsistent = await state.validateInstanceId();

      if (!isConsistent) {
        console.warn("⚠️ Mismatch de instancia detectado. Caché local invalidada.");
      }

      // La primera vez o en init, intentamos una sincronización delta/full
      await state.runSync();

      console.warn("Aplicación inicializada correctamente.");
    } catch (error) {
      console.error("Error en inicialización:", error);
      setTimeout(() => {
        get().addToast("Error al conectar con el servidor central.", "error");
      }, 500);
    }
  },

  validateInstanceId: async () => {
    const health = await configService.getHealth();
    if (!health || !health.instanceId) return true; // Fail safe

    const localInstanceId = localStorage.getItem("db_instance_id");

    if (localInstanceId && localInstanceId !== health.instanceId) {
      console.warn("🧨 DB Instance Mismatch! Wiping local data...");

      await wipeAllData();

      localStorage.removeItem("lastSyncTime");
      set({ lastSyncTime: null });
      localStorage.setItem("db_instance_id", health.instanceId);

      return false;
    }

    if (!localInstanceId) {
      localStorage.setItem("db_instance_id", health.instanceId);
    }

    return true;
  },
  conflicts: [],
  bulkAddRecords: async (records) => {
    try {
      await timeRecordService.bulkSave(records);
      return true;
    } catch (error) {
      console.error("Error bulk adding records:", error);
      return false;
    }
  },
});
