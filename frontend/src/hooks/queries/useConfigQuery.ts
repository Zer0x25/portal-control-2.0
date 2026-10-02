import { useQuery } from "@tanstack/react-query";
import { configService } from "../../services/configService";
import { authService } from "../../services/authService";

export const useConfigQuery = <T = unknown>(key: string) => {
  const hasToken = !!authService.getToken();
  return useQuery<T | null>({
    queryKey: ["config", key],
    queryFn: () => configService.get<T>(key),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: hasToken,
  });
};

export const useAccountingLockDateQuery = () => {
  const hasToken = !!authService.getToken();
  return useQuery<string | null>({
    queryKey: ["config", "accounting_lock_date"],
    queryFn: () => configService.get<string>("accounting_lock_date"),
    staleTime: 1000 * 60 * 5,
    enabled: hasToken,
  });
};

export const useGlobalMaxWeeklyHoursQuery = () => {
  const hasToken = !!authService.getToken();
  return useQuery<number>({
    queryKey: ["config", "global_max_hours"],
    queryFn: async () => (await configService.get<number>("global_max_hours")) ?? 44,
    staleTime: 1000 * 60 * 5,
    enabled: hasToken,
  });
};

export const useAreaListQuery = () => {
  const hasToken = !!authService.getToken();
  return useQuery<string[]>({
    queryKey: ["config", "area_list"],
    queryFn: async () => (await configService.get<string[]>("area_list")) ?? ["Otros"],
    staleTime: 1000 * 60 * 5,
    enabled: hasToken,
  });
};

export const useWorkdayTypeListQuery = () => {
  const hasToken = !!authService.getToken();
  return useQuery<string[]>({
    queryKey: ["config", "workday_types"],
    queryFn: async () =>
      (await configService.get<string[]>("workday_types")) ?? [
        "Artículo 22",
        "Full-Time",
        "Part-Time",
      ],
    staleTime: 1000 * 60 * 5,
    enabled: hasToken,
  });
};

export const useEmailRecipientsListQuery = () => {
  const hasToken = !!authService.getToken();
  return useQuery<string[]>({
    queryKey: ["config", "email_recipients"],
    queryFn: async () =>
      (await configService.get<string[]>("email_recipients")) ?? ["info@test.lan"],
    staleTime: 1000 * 60 * 5,
    enabled: hasToken,
  });
};

export const useControlInternoEnabledQuery = () => {
  const hasToken = !!authService.getToken();
  return useQuery<boolean>({
    queryKey: ["config", "is_control_interno_enabled"],
    queryFn: async () => (await configService.get<boolean>("is_control_interno_enabled")) ?? true,
    staleTime: 1000 * 60 * 5,
    enabled: hasToken,
  });
};
