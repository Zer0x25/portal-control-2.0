import { useMemo } from "react";
import { ShiftReport } from "../../../types/index";
import { useUsers } from "../../../hooks/useUsers";
import { useEmployees } from "../../../hooks/useEmployees";
import { useControlInternoEnabledQuery } from "../../../hooks/queries/useConfigQuery";
import { useUserClockingStatus } from "../../../hooks/queries/useTimeRecordsQuery";
import { useReportsQuery } from "../../../hooks/queries/useReportsQuery";
import { useAuth } from "../../../hooks/useAuth";
import { CheckCircleIcon, MinusCircleIcon } from "../../../components/ui/icons/index";
import { StatusType, StatusInfo } from "../types";

export const useMyStatusLogic = () => {
  const { currentUser } = useAuth();
  const userClockingStatus = useUserClockingStatus(currentUser?.employeeId);
  const { data: shiftReports = [] } = useReportsQuery();
  const { users } = useUsers();
  const { getEmployeeById } = useEmployees();
  const { data: isControlInternoEnabled = true } = useControlInternoEnabledQuery();

  const getResponsibleDisplayName = (username: string): string => {
    const user = users.find((u) => u.username === username);
    return user?.employeeId ? getEmployeeById(user.employeeId)?.name || username : username;
  };

  const activeShift = useMemo(() => {
    return shiftReports.find((s: ShiftReport) => s.status === "open");
  }, [shiftReports]);

  const statusInfo: Record<StatusType, StatusInfo> = {
    in: {
      text: "En Turno",
      icon: <CheckCircleIcon />,
      variant: "success" as const,
      textColor: "text-emerald-700 dark:text-emerald-400",
      borderColor: "border-emerald-500/20",
    },
    out: {
      text: "Fuera de Turno",
      icon: <MinusCircleIcon />,
      variant: "danger" as const,
      textColor: "text-red-700 dark:text-red-400",
      borderColor: "border-red-500/20",
    },
    not_employee: {
      text: "Sin Perfil",
      icon: <MinusCircleIcon />,
      variant: "neutral" as const,
      textColor: "text-token-text-secondary",
      borderColor: "border-token-border-subtle",
    },
    unknown: {
      text: "Desconocido",
      icon: <MinusCircleIcon />,
      variant: "neutral" as const,
      textColor: "text-token-text-secondary",
      borderColor: "border-token-border-subtle",
    },
  };

  const currentStatusKey: StatusType =
    userClockingStatus.status === "in" ||
    userClockingStatus.status === "out" ||
    userClockingStatus.status === "not_employee"
      ? userClockingStatus.status
      : "unknown";

  const currentStatus = statusInfo[currentStatusKey];

  const timeText =
    userClockingStatus.status === "in"
      ? `Desde las ${userClockingStatus.time}`
      : userClockingStatus.status === "out"
        ? `Último registro: ${userClockingStatus.time}`
        : "";

  const showActiveShift = Boolean(activeShift && isControlInternoEnabled);
  const responsibleName = activeShift ? getResponsibleDisplayName(activeShift.responsibleUser) : "";

  return {
    currentStatus,
    timeText,
    showActiveShift,
    responsibleName,
    isControlInternoEnabled,
  };
};
