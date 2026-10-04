import React from "react";
import { ShiftReport } from "../../../types/index";
import Card from "../../../components/ui/Card";
import DashboardRow from "../components/DashboardRow";

interface LatestReportsPanelProps {
  shiftReports: ShiftReport[];
  getResponsibleDisplayName: (username: string) => string;
  openReportDetailsModal: (report: ShiftReport) => void;
}

export const LatestReportsPanel: React.FC<LatestReportsPanelProps> = ({
  shiftReports,
  getResponsibleDisplayName,
  openReportDetailsModal,
}) => {
  return (
    <Card title="Historial de Turnos">
      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 px-1 custom-scrollbar">
        {shiftReports.slice(0, 5).map((report) => (
          <DashboardRow
            key={report.id}
            title={`Folio: ${report.folio}`}
            subtitle={report.shiftName}
            extra={
              <span className="text-[11px] font-semibold text-token-text-tertiary opacity-80 ml-1">
                • Resp: {getResponsibleDisplayName(report.responsibleUser)}
              </span>
            }
            indicator={
              <div
                className={`px-2.5 py-1 rounded-sm text-[11px] font-semibold uppercase tracking-wider border ${
                  report.status === "open"
                    ? "bg-emerald-600/10 text-emerald-600 border-emerald-600/20"
                    : "bg-token-surface-active text-token-text-tertiary border-token-border-technical"
                }`}
              >
                {report.status === "open" ? "En Curso" : "Cerrado"}
              </div>
            }
            onDoubleClick={() => openReportDetailsModal(report)}
            className="flex-col items-start! gap-1"
          />
        ))}

        {shiftReports.length === 0 && (
          <div className="py-12 text-center bg-token-surface-stripe rounded-sm border border-token-border-technical">
            <p className="text-[11px] font-semibold text-token-text-tertiary uppercase tracking-wider">
              Historial Operativo Vacío
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};
