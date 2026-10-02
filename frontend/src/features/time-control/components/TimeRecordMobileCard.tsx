import React from "react";
import {
  DailyTimeRecord,
  AugmentedTimeRecord,
  AuditLog,
  CorrectionRequest,
} from "../../../types/index";
import { ExclamationTriangleIcon } from "../../../components/ui/icons/index";
import { formatDisplayDateTime } from "../../../utils/formatters";
import Button from "../../../components/ui/Button";
import { TIME_RECORD_STATUS_CONFIG } from "../../../utils/mappings";

interface TimeRecordMobileCardProps {
  record: AugmentedTimeRecord;
  onRowDoubleClick: (record: AugmentedTimeRecord) => void;
  onAddComment: (record: DailyTimeRecord) => void;
  onDelete: (record: DailyTimeRecord) => void;
  isActionDisabledForRole: boolean;
  accountingLockDate: string | null;
  isControlInternoEnabled: boolean;
  externalEdits?: AuditLog[];
  externalPendingRequest?: CorrectionRequest;
}

const TimeRecordMobileCard: React.FC<TimeRecordMobileCardProps> = React.memo(
  ({
    record,
    onRowDoubleClick,
    onAddComment,
    onDelete,
    isActionDisabledForRole,
    accountingLockDate,
    isControlInternoEnabled,
    externalPendingRequest,
  }) => {
    const isLocked = !!(accountingLockDate && record.date <= accountingLockDate);
    const isJustified = !!record.justification;
    const statusConfig = TIME_RECORD_STATUS_CONFIG[record.status] || {
      label: record.status || "Desconocido",
      bg: "bg-gray-100",
      text: "text-gray-800",
    };
    const finalDisabledState = isActionDisabledForRole || isJustified || isLocked;
    const pendingRequest = externalPendingRequest;

    return (
      <div
        className={`p-4 mb-3 rounded-md shadow-sm border border-token-border-technical ${
          isLocked
            ? "bg-token-surface-stripe cursor-not-allowed mx-2 opacity-80"
            : isJustified
              ? "bg-purple-50/20 dark:bg-purple-900/10 cursor-help mx-2"
              : "bg-token-surface-card cursor-pointer hover:border-sap-blue transition-colors mx-2"
        }`}
        onDoubleClick={() => !isLocked && !isJustified && onRowDoubleClick(record)}
      >
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              {pendingRequest && (
                <ExclamationTriangleIcon className="w-3.5 h-3.5 text-token-status-warning" />
              )}
              <p className="text-[11px] font-black text-token-text-primary uppercase tracking-tight">
                {record.employeeName}
              </p>
            </div>
            <p className="text-[10px] font-bold text-token-text-tertiary uppercase tracking-widest">
              {record.employeeArea}
            </p>
          </div>
          <span
            className={`px-3 py-1 text-[10px] font-black rounded-md uppercase tracking-widest border border-gray-200 dark:border-gray-800 ${statusConfig.bg} ${statusConfig.text}`}
          >
            {statusConfig.label}
          </span>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
          <div className="grid grid-cols-2 gap-x-4 text-xs text-gray-600 dark:text-gray-400">
            <p>
              <strong>Entrada:</strong> {formatDisplayDateTime(record.entrada)}
            </p>
            <p>
              <strong>Salida:</strong> {formatDisplayDateTime(record.salida)}
            </p>
            <p>
              <strong>Ini. Colación:</strong> {formatDisplayDateTime(record.inicioColacion)}
            </p>
            <p>
              <strong>Fin Colación:</strong> {formatDisplayDateTime(record.finColacion)}
            </p>
          </div>
        </div>
        <div className="flex justify-end items-center mt-3 pt-3 border-t border-gray-100 dark:border-white/5 space-x-3">
          {isControlInternoEnabled && (
            <Button
              size="sm"
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                onAddComment(record);
              }}
              disabled={finalDisabledState}
              title="Agregar a Libro de Novedades"
              className="h-10 px-4 bg-sap-blue text-white rounded-md border-none shadow-sm font-black uppercase tracking-widest text-[10px]"
            >
              NOVEDAD
            </Button>
          )}
          <Button
            size="sm"
            variant="danger"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(record);
            }}
            disabled={finalDisabledState}
            title="Eliminar Registro"
            className="h-10 px-4 bg-rose-600 text-white rounded-md border-none shadow-sm font-black uppercase tracking-widest text-[10px]"
          >
            ELIMINAR
          </Button>
        </div>
      </div>
    );
  },
);

export default TimeRecordMobileCard;
