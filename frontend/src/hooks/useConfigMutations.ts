import { useMutation, useQueryClient } from "@tanstack/react-query";
import { configService } from "../services/configService";
import { useToasts } from "./useToasts";

export const useConfigMutations = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToasts();
  type ConfigValue =
    string | number | boolean | string[] | number[] | Record<string, unknown> | null;

  const updateConfigMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: ConfigValue }) =>
      configService.set(key, value),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["config", variables.key], variables.value);
      queryClient.invalidateQueries({ queryKey: ["config", variables.key] });

      // Map keys to pretty names for audit and toasts
      const keyMap: Record<string, string> = {
        global_max_hours: "Horas máximas globales",
        area_list: "Lista de áreas",
        workday_types: "Lista de tipos de jornada",
        email_recipients: "Lista de destinatarios de correo",
        accounting_lock_date: "Fecha de cierre contable",
        is_control_interno_enabled: "Módulo Control Interno",
      };

      const prettyName = keyMap[variables.key] || variables.key;

      if (variables.key === "is_control_interno_enabled") {
        addToast(`${prettyName} ${variables.value ? "activado" : "desactivado"}.`, "success");
      } else {
        addToast(`${prettyName} actualizada correctamente.`, "success");
      }
    },
    onError: (error: Error) => {
      addToast(error.message, "error");
    },
  });

  return {
    updateConfig: updateConfigMutation.mutateAsync,
    isPending: updateConfigMutation.isPending,
  };
};
