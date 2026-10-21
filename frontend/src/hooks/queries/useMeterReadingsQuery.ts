import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { meterService } from "../../services/meterService";
import { configService } from "../../services/configService";
import { authService } from "../../services/authService";
import { MeterConfig, MeterReadingItem } from "../../types";
import { queryKeys } from "../../lib/queryKeys";

/** Lecturas de medidores como única fuente (spec 032 T5). */
export const useMeterReadingsQuery = () => {
  const hasToken = !!authService.getToken();

  return useQuery<MeterReadingItem[]>({
    queryKey: queryKeys.meterReadings(),
    queryFn: async () => {
      const readings = await meterService.getAll();
      // Mismo orden que exige la UI: mas reciente primero.
      return [...readings].sort((a, b) => b.timestamp - a.timestamp);
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: hasToken,
  });
};

/** Configuración de medidores: vive en la raíz `config` de TanStack Query. */
export const useMeterConfigsQuery = () => {
  const hasToken = !!authService.getToken();

  return useQuery<MeterConfig[]>({
    queryKey: queryKeys.config("meter_configs"),
    queryFn: async () => (await configService.get<MeterConfig[]>("meter_configs")) ?? [],
    staleTime: 1000 * 60 * 5,
    enabled: hasToken,
  });
};

export const useMeterConfigMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (configs: MeterConfig[]) => {
      const filtered = configs.filter((config) => !config.isDeleted);
      await configService.set("meter_configs", filtered);
      return filtered;
    },
    onSuccess: (filtered) => {
      queryClient.setQueryData(queryKeys.config("meter_configs"), filtered);
      queryClient.invalidateQueries({ queryKey: queryKeys.configRoot() });
    },
  });
};
