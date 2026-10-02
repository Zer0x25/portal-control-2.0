import { StateCreator } from "zustand";
import { MeterReadingItem, MeterConfig } from "../../types/index";
import { AppState } from "../types";
import { meterService } from "../../services/meterService";
import { configService } from "../../services/configService";
import { idbPutBulk, STORES, setSettingValue } from "../../utils/indexedDB";

export interface MeterReadingSlice {
  readings: MeterReadingItem[];
  meterConfigs: MeterConfig[];
  isLoadingReadings: boolean;
  loadMeterData: () => Promise<void>;
  updateMeterConfigs: (newConfigs: MeterConfig[], actorUsername: string) => Promise<void>;
}

export const createMeterReadingSlice: StateCreator<AppState, [], [], MeterReadingSlice> = (
  set,
  get,
) => ({
  readings: [],
  meterConfigs: [],
  isLoadingReadings: false,

  loadMeterData: async () => {
    const { lastSyncTime, readings: currentReadings } = get();
    const since = lastSyncTime;
    set({ isLoadingReadings: true });
    try {
      const [remoteReadings, configs] = await Promise.all([
        meterService.getAll(since || undefined),
        configService.get<MeterConfig[]>("meter_configs"),
      ]);

      let newList: MeterReadingItem[];
      if (!since || currentReadings.length === 0) {
        newList = remoteReadings;
      } else {
        const remoteIds = new Set(remoteReadings.map((r) => r.id));
        newList = [...currentReadings.filter((r) => !remoteIds.has(r.id)), ...remoteReadings];
      }
      // Sort by timestamp desc
      newList.sort((a, b) => b.timestamp - a.timestamp);

      set({ readings: newList, meterConfigs: configs || [] });

      // Background Persistence (Smart Delta Sync)
      if (remoteReadings.length > 0) {
        await idbPutBulk(STORES.METER_READINGS, remoteReadings);
      }
      if (configs && configs.length > 0) {
        // meter_configs is a single key in appSettings
        await setSettingValue("meter_configs", configs);
      }
    } catch (error) {
      console.error("Error loading meter data:", error);
    } finally {
      set({ isLoadingReadings: false });
    }
  },

  updateMeterConfigs: async (newConfigs, _actor) => {
    try {
      const filtered = newConfigs.filter((c) => !c.isDeleted);
      await configService.set("meter_configs", filtered);
      set({ meterConfigs: filtered });
    } catch (error) {
      console.error("Error al guardar config de medidores:", error);
    }
  },
});
