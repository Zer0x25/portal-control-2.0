import React, { useEffect } from "react";
import { STORAGE_KEYS } from "../../constants";
import { useAuth } from "../../hooks/useAuth";
import { useScheduling } from "../../hooks/useScheduling";
import { useShiftManager } from "../../hooks/useShiftManager";

const AutoStartShiftAutomation: React.FC<{ useClockingOptions?: boolean }> = ({
  useClockingOptions = false,
}) => {
  const { currentUser } = useAuth();
  const { getEmployeeDailyScheduleInfo, isLoadingSchedulingData } = useScheduling(
    undefined,
    undefined,
    { enabled: true, useClockingOptions },
  );
  const { startNewShift } = useShiftManager();

  useEffect(() => {
    const runShiftStartAutomation = async () => {
      if (
        sessionStorage.getItem(STORAGE_KEYS.AUTO_LOGIN_ACTIONS_DONE) ||
        !currentUser?.employeeId ||
        isLoadingSchedulingData
      ) {
        return;
      }

      sessionStorage.setItem(STORAGE_KEYS.AUTO_LOGIN_ACTIONS_DONE, "true");

      const now = new Date();
      const scheduleInfo = getEmployeeDailyScheduleInfo(currentUser.employeeId, now);
      if (!scheduleInfo?.isWorkDay || !scheduleInfo.startTime) return;

      const shiftStartTime = new Date(now);
      const [startHour, startMinute] = scheduleInfo.startTime.split(":").map(Number);
      shiftStartTime.setHours(startHour, startMinute, 0, 0);

      if (now >= shiftStartTime) {
        await startNewShift();
      }
    };

    void runShiftStartAutomation();
  }, [currentUser, getEmployeeDailyScheduleInfo, isLoadingSchedulingData, startNewShift]);

  return null;
};

export default AutoStartShiftAutomation;
