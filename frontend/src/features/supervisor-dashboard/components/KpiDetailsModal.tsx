import React from "react";
import { DailyTimeRecord, Employee } from "../../../types";
import Button from "../../../components/ui/Button";
import { CloseIcon } from "../../../components/ui/icons/index";
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
  if (!isOpen) return null;

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
            <p className="text-[10px] font-semibold text-sap-blue uppercase tracking-widest mt-1.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sap-blue" />
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
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-token-text-primary/40 backdrop-blur-[2px] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-token-surface-card border border-token-border-technical rounded-sm shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-token-border-technical bg-token-surface-stripe shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-sap-blue rounded-full" />
            <h3 className="text-[13px] font-bold text-token-text-primary uppercase tracking-widest">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-token-text-tertiary hover:text-sap-blue hover:bg-sap-blue/10 rounded-sm transition-all"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto custom-scrollbar grow bg-token-surface-card">
          <ul className="divide-y divide-token-border-subtle">{renderContent()}</ul>
        </div>
        <div className="p-5 bg-token-surface-stripe border-t border-token-border-technical shrink-0 flex justify-end">
          <Button
            onClick={onClose}
            className="px-8 py-2.5 text-[11px] font-bold uppercase tracking-widest bg-sap-blue hover:brightness-110 text-white rounded-sm border-none shadow-md active:scale-95 transition-all"
          >
            Finalizar Revisión
          </Button>
        </div>
      </div>
    </div>
  );
};

export default KpiDetailsModal;
