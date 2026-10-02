import { useStore } from "../store/useStore";
import { useMeterMutations } from "./useMeterMutations";
import { idFactory } from "../utils/idFactory";
import { MeterReadingItem } from "../types/dashboard";

export const useMeterReadings = () => {
  const readings = useStore((state) => state.readings);
  const meterConfigs = useStore((state) => state.meterConfigs);
  const isLoadingReadings = useStore((state) => state.isLoadingReadings);
  const updateMeterConfigs = useStore((state) => state.updateMeterConfigs);
  const currentUser = useStore((state) => state.currentUser);

  const { addReading: addReadingMutation, isPending } = useMeterMutations();

  const addReading = async (newReadings: { meterConfigId: string; value: string }[]) => {
    const actor = currentUser?.username || "System";
    const now = Date.now();

    const newEntries: MeterReadingItem[] = newReadings.map(({ meterConfigId, value }) => ({
      id: idFactory.ulid(),
      meterConfigId,
      timestamp: now,
      authorUsername: actor,
      value: parseFloat(value.replace("+", "")),
      isRecharge: value.startsWith("+"),
      normalizedValue: parseFloat(value.replace("+", "")),
      syncStatus: "synced",
      lastModified: now,
      isDeleted: false,
      delta: 0,
      eventType: "UNKNOWN",
    }));

    return addReadingMutation(newEntries);
  };

  return {
    readings,
    meterConfigs,
    isLoadingReadings: isLoadingReadings || isPending,
    addReading,
    updateMeterConfigs,
  };
};
