import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { useEmployees } from "./useEmployees";
import { useUsers } from "./useUsers";
import { useScheduling } from "./useScheduling";
import { STORAGE_KEYS } from "../constants";
import { useShiftManager } from "./useShiftManager";
import { useReportsQuery } from "./queries/useReportsQuery";
import { ShiftHandoverData } from "../types/index";
import { logger } from "../utils/logger";
import { shouldLoadAutoStartSchedule } from "../utils/autoStartEligibility";

export const useLoginAutomations = () => {
  const { currentUser } = useAuth();
  const { getEmployeeById } = useEmployees();
  const { users } = useUsers();
  const automationEmployee = currentUser?.employeeId
    ? getEmployeeById(currentUser.employeeId)
    : undefined;
  const canLoadAutoStartSchedule = shouldLoadAutoStartSchedule(
    currentUser?.role,
    currentUser?.employeeId,
    automationEmployee,
  );
  const { getEmployeeDailyScheduleInfo, isLoadingSchedulingData } = useScheduling(
    undefined,
    undefined,
    {
      enabled: canLoadAutoStartSchedule,
    },
  );
  const { startNewShift } = useShiftManager();
  const { data: shiftReports = [] } = useReportsQuery(); // Use Query

  // State for the Handover Modal
  const [handoverData, setHandoverData] = useState<ShiftHandoverData | null>(null);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);

  const closeHandoverModal = () => {
    setIsHandoverModalOpen(false);
  };

  useEffect(() => {
    const getResponsibleDisplayName = (username: string): string => {
      const user = users.find((u) => u.username === username);
      if (user?.employeeId) {
        const employee = getEmployeeById(user.employeeId);
        return employee?.name || username;
      }
      return username;
    };

    // --- Automation 1: Auto-start shift for Reloj Control ---
    const runShiftStartAutomation = async () => {
      if (
        sessionStorage.getItem(STORAGE_KEYS.AUTO_LOGIN_ACTIONS_DONE) ||
        !currentUser?.employeeId ||
        !canLoadAutoStartSchedule
      )
        return;

      if (!automationEmployee || isLoadingSchedulingData) return;

      sessionStorage.setItem(STORAGE_KEYS.AUTO_LOGIN_ACTIONS_DONE, "true");

      const now = new Date();
      const scheduleInfo = getEmployeeDailyScheduleInfo(automationEmployee.id, now);
      if (!scheduleInfo?.isWorkDay || !scheduleInfo.startTime) return;

      const shiftStartTime = new Date(now);
      const [startHour, startMinute] = scheduleInfo.startTime.split(":").map(Number);
      shiftStartTime.setHours(startHour, startMinute, 0, 0);

      if (now >= shiftStartTime) {
        await startNewShift();
      }
    };

    // --- Automation 2: Show Shift Handover Modal ---
    const runHandoverCheck = async () => {
      if (sessionStorage.getItem(STORAGE_KEYS.SHIFT_HANDOVER_VIEWED)) return;

      const applicableRoles = ["Reloj_Control", "Administrador", "Supervisor_Elevado"];
      if (!currentUser || !applicableRoles.includes(currentUser.role)) return;

      sessionStorage.setItem(STORAGE_KEYS.SHIFT_HANDOVER_VIEWED, "true");

      try {
        // Use shiftReports from store
        const lastClosedReport = shiftReports
          .filter((r) => r.status === "closed" && r.endTime)
          .sort((a, b) => new Date(b.endTime!).getTime() - new Date(a.endTime!).getTime())[0];

        if (lastClosedReport) {
          const responsibleUser = getResponsibleDisplayName(lastClosedReport.responsibleUser);
          const automaticClosures = lastClosedReport.logEntries.filter((e) =>
            e.annotation.includes("MARCAJE AUTOMÁTICO"),
          );
          const logEntries = lastClosedReport.logEntries.filter(
            (e) =>
              !e.annotation.includes("Inicio de Turno") &&
              !e.annotation.includes("Cierre de Turno") &&
              !e.annotation.includes("MARCAJE AUTOMÁTICO"),
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
    };

    // Run both automations
    runShiftStartAutomation();
    runHandoverCheck();
  }, [
    currentUser,
    automationEmployee,
    canLoadAutoStartSchedule,
    getEmployeeById,
    getEmployeeDailyScheduleInfo,
    isLoadingSchedulingData,
    startNewShift,
    shiftReports,
    users,
  ]);

  return { handoverData, isHandoverModalOpen, closeHandoverModal };
};
