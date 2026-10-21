import { useStore } from "../store/useStore";
import { useMeterMutations } from "./useMeterMutations";
import {
  useMeterConfigMutation,
  useMeterConfigsQuery,
  useMeterReadingsQuery,
} from "./queries/useMeterReadingsQuery";
import { idFactory } from "../utils/idFactory";
import { MeterConfig } from "../types";
import { MeterReadingItem } from "../types/dashboard";

/**
 * Lecturas de medidores: única fuente = `useMeterReadingsQuery`
 * (spec 032 T5). El store deja de duplicar `readings`/`meterConfigs`.
 */
export const useMeterReadings = () => {
  const { data: readings = [], isLoading } = useMeterReadingsQuery();
  const { data: meterConfigs = [] } = useMeterConfigsQuery();
  const currentUser = useStore((state) => state.currentUser);
  const saveMeterConfigs = useMeterConfigMutation();

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
    isLoadingReadings: isLoading || isPending,
    addReading,
    updateMeterConfigs: (configs: MeterConfig[], _actor?: string) =>
      saveMeterConfigs.mutateAsync(configs),
  };
};
