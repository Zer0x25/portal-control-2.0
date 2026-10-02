import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { useEmployees } from "./useEmployees";
import { useUsers } from "./useUsers";
import { useScheduling } from "./useScheduling";
import { STORAGE_KEYS } from "../constants";
import { useShiftManager } from "./useShiftManager";
import { useReportsQuery } from "./queries/useReportsQuery";
import { ShiftHandoverData } from "../types/index";

export const useLoginAutomations = () => {
  const { currentUser } = useAuth();
  const { getEmployeeById } = useEmployees();
  const { users } = useUsers();
  const { getEmployeeDailyScheduleInfo } = useScheduling();
  const { startNewShift } = useShiftManager();
  const { data: shiftReports = [] } = useReportsQuery(); // Use Query

  // State for the Handover Modal
  const [handoverData, setHandoverData] = useState<ShiftHandoverData | null>(null);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);

  const getResponsibleDisplayName = useCallback(
    (username: string): string => {
      const user = users.find((u) => u.username === username);
      if (user?.employeeId) {
        const employee = getEmployeeById(user.employeeId);
        return employee?.name || username;
      }
      return username;
    },
    [users, getEmployeeById],
  );

  const closeHandoverModal = useCallback(() => {
    setIsHandoverModalOpen(false);
  }, []);

  useEffect(() => {
    // --- Automation 1: Auto-start shift for Reloj Control ---
    const runShiftStartAutomation = async () => {
      if (sessionStorage.getItem(STORAGE_KEYS.AUTO_LOGIN_ACTIONS_DONE) || !currentUser?.employeeId)
        return;

      const employee = getEmployeeById(currentUser.employeeId);
      if (!employee) return;

      const hasPermission =
        currentUser.role === "Reloj_Control" ||
        ((currentUser.role === "Administrador" || currentUser.role === "Supervisor_Elevado") &&
          employee.position === "Reloj_Control");
      if (!hasPermission) return;

      sessionStorage.setItem(STORAGE_KEYS.AUTO_LOGIN_ACTIONS_DONE, "true");

      const now = new Date();
      const scheduleInfo = getEmployeeDailyScheduleInfo(employee.id, now);
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
        console.error("Failed to process shift handover data:", error);
      }
    };

    // Run both automations
    runShiftStartAutomation();
    runHandoverCheck();
  }, [
    currentUser,
    getEmployeeById,
    getEmployeeDailyScheduleInfo,
    getResponsibleDisplayName,
    startNewShift,
    shiftReports,
  ]);

  return { handoverData, isHandoverModalOpen, closeHandoverModal };
};
