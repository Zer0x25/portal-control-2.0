import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { useEmployees } from "./useEmployees";
import { useUsers } from "./useUsers";
import { STORAGE_KEYS } from "../constants";
import { useReportsQuery } from "./queries/useReportsQuery";
import type { ShiftHandoverData } from "../types/index";
import { logger } from "../utils/logger";
import { shouldLoadAutoStartSchedule } from "../utils/autoStartEligibility";

export const useLoginAutomations = () => {
  const { currentUser } = useAuth();
  const { getEmployeeById } = useEmployees();
  const [hasViewedHandover, setHasViewedHandover] = useState(() =>
    Boolean(sessionStorage.getItem(STORAGE_KEYS.SHIFT_HANDOVER_VIEWED)),
  );
  const canCheckHandover =
    !!currentUser &&
    ["Reloj_Control", "Administrador", "Supervisor_Elevado"].includes(currentUser.role) &&
    !hasViewedHandover;
  const { data: shiftReports = [], isLoading: isLoadingReports } = useReportsQuery(
    {},
    { enabled: canCheckHandover },
  );
  const lastClosedReport = shiftReports
    .filter((report) => report.status === "closed" && report.endTime)
    .sort(
      (left, right) => new Date(right.endTime!).getTime() - new Date(left.endTime!).getTime(),
    )[0];
  const canReadUserDirectory =
    !!currentUser && ["Administrador", "Supervisor_Elevado"].includes(currentUser.role);
  const shouldLoadUsers =
    canCheckHandover && !isLoadingReports && !!lastClosedReport && canReadUserDirectory;
  const { users, isLoadingUsers } = useUsers({ enabled: shouldLoadUsers });
  const automationEmployee = currentUser?.employeeId
    ? getEmployeeById(currentUser.employeeId)
    : undefined;
  const isAutoStartEligible = shouldLoadAutoStartSchedule(
    currentUser?.role,
    currentUser?.employeeId,
    automationEmployee,
  );

  const [handoverData, setHandoverData] = useState<ShiftHandoverData | null>(null);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);

  const closeHandoverModal = () => {
    setIsHandoverModalOpen(false);
  };

  useEffect(() => {
    if (!canCheckHandover || isLoadingReports) return;

    if (!lastClosedReport) {
      sessionStorage.setItem(STORAGE_KEYS.SHIFT_HANDOVER_VIEWED, "true");
      setHasViewedHandover(true);
      return;
    }

    if (shouldLoadUsers && isLoadingUsers) return;

    const getResponsibleDisplayName = (username: string): string => {
      const user = users.find((candidate) => candidate.username === username);
      if (user?.employeeId) {
        const employee = getEmployeeById(user.employeeId);
        return employee?.name || username;
      }
      return username;
    };

    sessionStorage.setItem(STORAGE_KEYS.SHIFT_HANDOVER_VIEWED, "true");
    setHasViewedHandover(true);

    try {
      const responsibleUser = getResponsibleDisplayName(lastClosedReport.responsibleUser);
      const automaticClosures = lastClosedReport.logEntries.filter((entry) =>
        entry.annotation.includes("MARCAJE AUTOMÁTICO"),
      );
      const logEntries = lastClosedReport.logEntries.filter(
        (entry) =>
          !entry.annotation.includes("Inicio de Turno") &&
          !entry.annotation.includes("Cierre de Turno") &&
          !entry.annotation.includes("MARCAJE AUTOMÁTICO"),
      );

      setHandoverData({
        responsibleUser,
        endTime: lastClosedReport.endTime!,
        logEntries,
        automaticClosures,
      });
      setIsHandoverModalOpen(true);
    } catch (error) {
      logger.error("Failed to process shift handover data:", error);
    }
  }, [
    canCheckHandover,
    getEmployeeById,
    isLoadingReports,
    isLoadingUsers,
    lastClosedReport,
    setHasViewedHandover,
    shouldLoadUsers,
    users,
  ]);

  return {
    handoverData,
    isAutoStartEligible,
    isHandoverModalOpen,
    closeHandoverModal,
  };
};
