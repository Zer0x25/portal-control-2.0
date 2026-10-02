import { StateCreator } from "zustand";
import { AppState } from "../types";
import { configService } from "../../services/configService";
import { AppSetting } from "../../types/index";

import { getSettingValue, idbPutBulk, STORES } from "../../utils/indexedDB";

export interface ConfigSlice {
  globalMaxWeeklyHours: number;
  areaList: string[];
  workdayTypeList: string[];
  emailRecipientsList: string[];
  accountingLockDate: string | null;
  isControlInternoEnabled: boolean;
  serverTimeOffset: number;

  loadConfigData: () => Promise<void>;
  syncServerTime: () => Promise<void>;
  updateGlobalMaxWeeklyHours: (newMaxHours: number, actorUsername: string) => Promise<void>;
  updateAreaList: (newAreas: string[], actorUsername: string) => Promise<void>;
  updateWorkdayTypeList: (newTypes: string[], actorUsername: string) => Promise<void>;
  updateEmailRecipientsList: (newEmails: string[], actorUsername: string) => Promise<void>;
  updateAccountingLockDate: (newDate: string | null, actorUsername: string) => Promise<boolean>;
  updateControlInternoModule: (enabled: boolean, actorUsername: string) => Promise<void>;
}

export const createConfigSlice: StateCreator<AppState, [], [], ConfigSlice> = (set, get) => ({
  globalMaxWeeklyHours: 44,
  areaList: ["Otros"],
  workdayTypeList: ["Artículo 22", "Full-Time", "Part-Time"],
  emailRecipientsList: ["info@test.lan"],
  accountingLockDate: null,
  isControlInternoEnabled: true,
  serverTimeOffset: 0,

  loadConfigData: async () => {
    const keys = [
      "global_max_hours",
      "area_list",
      "workday_types",
      "email_recipients",
      "accounting_lock_date",
      "is_control_interno_enabled",
    ];

    // 1. Carga rápida desde la caché local (SWR Step 1)
    try {
      const [maxHours, areas, workdayTypes, recipients, lockDate, controlInterno] =
        await Promise.all([
          getSettingValue<number>("global_max_hours", 44),
          getSettingValue<string[]>("area_list", ["Otros"]),
          getSettingValue<string[]>("workday_types", ["Artículo 22", "Full-Time", "Part-Time"]),
          getSettingValue<string[]>("email_recipients", ["info@test.lan"]),
          getSettingValue<string | null>("accounting_lock_date", null),
          getSettingValue<boolean>("is_control_interno_enabled", true),
        ]);

      set({
        globalMaxWeeklyHours: maxHours,
        areaList: areas,
        workdayTypeList: workdayTypes,
        emailRecipientsList: recipients,
        accountingLockDate: lockDate,
        isControlInternoEnabled: controlInterno,
      });
    } catch (e) {
      console.warn("Error cargando configuración de la caché:", e);
    }

    // 2. Sincronización con el servidor (SWR Step 2)
    try {
      const [
        globalMaxWeeklyHours,
        areaList,
        workdayTypeList,
        emailRecipientsList,
        accountingLockDate,
        isControlInternoEnabled,
      ] = await Promise.all([
        configService.get<number>("global_max_hours"),
        configService.get<string[]>("area_list"),
        configService.get<string[]>("workday_types"),
        configService.get<string[]>("email_recipients"),
        configService.get<string>("accounting_lock_date"),
        configService.get<boolean>("is_control_interno_enabled"),
      ]);

      const configs = [
        globalMaxWeeklyHours,
        areaList,
        workdayTypeList,
        emailRecipientsList,
        accountingLockDate,
        isControlInternoEnabled,
      ];

      set({
        globalMaxWeeklyHours: globalMaxWeeklyHours ?? 44,
        areaList: areaList ?? ["Otros"],
        workdayTypeList: workdayTypeList ?? ["Artículo 22", "Full-Time", "Part-Time"],
        emailRecipientsList: emailRecipientsList ?? ["info@test.lan"],
        accountingLockDate: accountingLockDate ?? null,
        isControlInternoEnabled: isControlInternoEnabled ?? true,
      });

      // 3. Persist en la caché local para la próxima vez usando Smart Bulk Sync
      const appSettings: AppSetting[] = keys.map((k, i) => ({
        id: k,
        value: configs[i],
        lastModified: Date.now(), // In bulk settings, we might want a server-provided timestamp, but AppSetting doesn't have it on server usually.
        syncStatus: "synced",
        isDeleted: false,
      }));

      await idbPutBulk(STORES.APP_SETTINGS, appSettings);
    } catch (error) {
      console.error("Error al cargar configuración:", error);
    }

    // 4. Sincronizar tiempo del servidor una vez
    get().syncServerTime();
  },

  syncServerTime: async () => {
    try {
      const startTime = Date.now();
      const serverData = await configService.getServerTime();
      const endTime = Date.now();

      if (serverData) {
        const rtt = endTime - startTime;
        const serverTimeAtClientEnd = serverData.timestamp + rtt / 2;
        const offset = serverTimeAtClientEnd - endTime;
        set({ serverTimeOffset: offset });
      }
    } catch (error) {
      console.error("[GlobalServerTime] Sync failed:", error);
    }
  },

  updateGlobalMaxWeeklyHours: async (newMaxHours, _actor) => {
    await configService.set("global_max_hours", newMaxHours);
    set({ globalMaxWeeklyHours: newMaxHours });
    get().addToast("Horas máximas globales actualizadas.", "success");
  },
  updateAreaList: async (newAreas, _actor) => {
    await configService.set("area_list", newAreas);
    set({ areaList: newAreas });
    get().addToast("Lista de áreas actualizada.", "success");
  },
  updateWorkdayTypeList: async (newTypes, _actor) => {
    await configService.set("workday_types", newTypes);
    set({ workdayTypeList: newTypes });
    get().addToast("Lista de tipos de jornada actualizada.", "success");
  },
  updateEmailRecipientsList: async (newEmails, _actor) => {
    await configService.set("email_recipients", newEmails);
    set({ emailRecipientsList: newEmails });
    get().addToast("Lista de correos actualizada.", "success");
  },
  updateAccountingLockDate: async (newDate, _actor) => {
    await configService.set("accounting_lock_date", newDate);
    set({ accountingLockDate: newDate });
    get().addToast("Fecha de cierre contable actualizada.", "success");
    return true;
  },
  updateControlInternoModule: async (enabled, _actor) => {
    await configService.set("is_control_interno_enabled", enabled);
    set({ isControlInternoEnabled: enabled });
    get().addToast(
      enabled ? "Módulo Control Interno activado." : "Módulo Control Interno desactivado.",
      "success",
    );
  },
});
