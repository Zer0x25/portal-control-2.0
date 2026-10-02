import React from "react";
import { DailyTimeRecord } from "../../../types/index";
import { WidgetContainer } from "./ui/WidgetContainer";
import { MetricGrid, useTeamMetrics } from "./ui/MetricGrid";
import DashboardRow from "./ui/DashboardRow";
import { useTeamStatusLogic } from "../hooks/useTeamStatusLogic";

interface TeamStatusPanelProps {
  onUnscheduledPresentDoubleClick: (record: DailyTimeRecord) => void;
  openAnomaliesModal: () => void;
  openPresentModal: () => void;
}

export const TeamStatusPanel: React.FC<TeamStatusPanelProps> = ({
  onUnscheduledPresentDoubleClick,
  openAnomaliesModal,
  openPresentModal,
}) => {
  const { teamStatus, unscheduledPresent, hasUnscheduledPresent } = useTeamStatusLogic();

  const metrics = useTeamMetrics(
    teamStatus.present,
    teamStatus.total,
    teamStatus.anomalies.length,
    openPresentModal,
    openAnomaliesModal,
  );

  return (
    <WidgetContainer title="Panel de Operación">
      <div className="space-y-6">
        <MetricGrid metrics={metrics} />

        {hasUnscheduledPresent && (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 px-1">
              <div className="w-1 h-4 bg-sap-blue opacity-50 rounded-full" />
              <h4 className="font-semibold text-[11px] uppercase tracking-wider text-token-text-tertiary leading-none">
                Sin Horario Asignado
              </h4>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 px-1 custom-scrollbar">
              {unscheduledPresent.map((record: DailyTimeRecord, index) => (
                <DashboardRow
                  key={record.id}
                  initial={record.employeeName.charAt(0)}
                  title={record.employeeName}
                  subtitle={record.employeePosition}
                  indicator={
                    <div className="w-1.5 h-1.5 rounded-full bg-sap-blue/40 border border-sap-blue/20 shadow-sm"></div>
                  }
                  onDoubleClick={() => onUnscheduledPresentDoubleClick(record)}
                  animationDelay={index * 0.05}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </WidgetContainer>
  );
};

export default TeamStatusPanel;
