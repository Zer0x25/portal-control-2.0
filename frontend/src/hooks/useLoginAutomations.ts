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
  const { users } = useUsers();
  const automationEmployee = currentUser?.employeeId
    ? getEmployeeById(currentUser.employeeId)
    : undefined;
  const isAutoStartEligible = shouldLoadAutoStartSchedule(
    currentUser?.role,
    currentUser?.employeeId,
    automationEmployee,
  );
  const { data: shiftReports = [] } = useReportsQuery();

  const [handoverData, setHandoverData] = useState<ShiftHandoverData | null>(null);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);

  const closeHandoverModal = () => {
    setIsHandoverModalOpen(false);
  };

  useEffect(() => {
    const getResponsibleDisplayName = (username: string): string => {
      const user = users.find((candidate) => candidate.username === username);
      if (user?.employeeId) {
        const employee = getEmployeeById(user.employeeId);
        return employee?.name || username;
      }
      return username;
    };

    if (sessionStorage.getItem(STORAGE_KEYS.SHIFT_HANDOVER_VIEWED)) return;

    const applicableRoles = ["Reloj_Control", "Administrador", "Supervisor_Elevado"];
    if (!currentUser || !applicableRoles.includes(currentUser.role)) return;

    sessionStorage.setItem(STORAGE_KEYS.SHIFT_HANDOVER_VIEWED, "true");

    try {
      const lastClosedReport = shiftReports
        .filter((report) => report.status === "closed" && report.endTime)
        .sort(
          (left, right) => new Date(right.endTime!).getTime() - new Date(left.endTime!).getTime(),
        )[0];

      if (lastClosedReport) {
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
      }
    } catch (error) {
      logger.error("Failed to process shift handover data:", error);
    }
  }, [currentUser, getEmployeeById, shiftReports, users]);

  return {
    handoverData,
    isAutoStartEligible,
    isHandoverModalOpen,
    closeHandoverModal,
  };
};
