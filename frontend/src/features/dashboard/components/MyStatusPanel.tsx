import React from "react";
import { WidgetContainer } from "./ui/WidgetContainer";
import { StatusCard, ShiftStatusCard } from "./ui/StatusCard";
import { useMyStatusData } from "../hooks/useMyStatusData";

export const MyStatusPanel: React.FC = () => {
  const { currentStatus, timeText, showActiveShift, responsibleName } = useMyStatusData();

  return (
    <WidgetContainer title="Mi Jornada">
      <div className="flex flex-col gap-3">
        <StatusCard status={currentStatus} timeText={timeText} />

        {showActiveShift && <ShiftStatusCard responsibleName={responsibleName} />}
      </div>
    </WidgetContainer>
  );
};

export default MyStatusPanel;
