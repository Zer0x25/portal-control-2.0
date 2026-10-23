import React from "react";
import { DailyTimeRecord, Employee } from "../../../types";
import Button from "../../../components/ui/Button";
import CinematicModal from "../../../components/ui/CinematicModal";
import { formatDisplayDateTime } from "../../../utils/formatters";
import { parseDateOnlyUTC } from "../../../utils/dateUtils";

interface KpiDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: (DailyTimeRecord | Employee | { id: string; employeeName: string; date: string })[];
  dataType: "record" | "employee" | "justification";
}

/**
 * 🔍 KpiDetailsModal: Visor de Auditados
 * Standard Industrial-Elegant
 */
const KpiDetailsModal: React.FC<KpiDetailsModalProps> = ({
  isOpen,
  onClose,
  title,
  data,
  dataType,
}) => {
  const renderContent = () => {
    if (data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-10 opacity-30">
          <p className="text-[11px] font-semibold text-token-text-tertiary uppercase tracking-widest text-center">
            No se identificaron registros operativos
          </p>
        </div>
      );
    }

    switch (dataType) {
      case "record":
        return (data as DailyTimeRecord[]).map((item, idx) => (
          <li
            key={item.id || `record-${idx}`}
            className="group py-3.5 border-b border-token-border-subtle last:border-b-0 hover:bg-token-surface-stripe px-6 transition-colors"
          >
            <p className="text-[13px] font-bold text-token-text-primary uppercase tracking-tight">
              {item.employeeName}
            </p>
            <p className="text-[10px] font-semibold text-token-accent-brand uppercase tracking-widest mt-1.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-token-accent-brand" />
              Atraso detectado: {formatDisplayDateTime(item.entrada)}
            </p>
          </li>
        ));
      case "employee":
        return (data as (Employee & { absenceDate: string })[]).map((item, idx) => (
          <li
            key={`${item.id}-${item.absenceDate}-${idx}`}
            className="group py-3.5 border-b border-token-border-subtle last:border-b-0 hover:bg-token-surface-stripe px-6 transition-colors"
          >
            <p className="text-[13px] font-bold text-token-text-primary uppercase tracking-tight">
              {item.name}
            </p>
            <p className="text-[10px] font-semibold text-rose-600 uppercase tracking-widest mt-1.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
              Ausencia registrada:{" "}
              {parseDateOnlyUTC(item.absenceDate).toLocaleDateString("es-CL", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
            </p>
          </li>
        ));
      case "justification":
        return (data as { id: string; employeeName: string; date: string }[]).map((item, idx) => (
          <li
            key={item.id || `justif-${item.date}-${idx}`}
            className="group py-3.5 border-b border-token-border-subtle last:border-b-0 hover:bg-token-surface-stripe px-6 transition-colors"
          >
            <p className="text-[13px] font-bold text-token-text-primary uppercase tracking-tight">
              {item.employeeName}
            </p>
            <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest mt-1.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
              Evento justificado:{" "}
              {parseDateOnlyUTC(item.date).toLocaleDateString("es-CL", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
            </p>
          </li>
        ));
      default:
        return null;
    }
  };

  return (
    <CinematicModal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-xl">
      <ul className="divide-y divide-token-border-subtle">{renderContent()}</ul>
      <div className="mt-6 flex justify-end">
        <Button onClick={onClose}>Finalizar Revisión</Button>
      </div>
    </CinematicModal>
  );
};

export default KpiDetailsModal;
