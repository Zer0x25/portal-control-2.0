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

// Spec 037 T12: this stacked mobile card groups schedule, correction, and action details that do not fit the 66 px desktop row.
// Keep the card memoized because the virtualizer mounts one card per visible record.
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
      bg: "bg-token-surface-stripe",
      text: "text-token-text-primary",
    };
    const finalDisabledState = isActionDisabledForRole || isJustified || isLocked;
    const pendingRequest = externalPendingRequest;

    return (
      <div
        data-testid="time-record-card"
        data-list-group="responsive-record-cards"
        className={`p-4 mb-3 rounded-md shadow-sm border border-token-border-technical ${
          isLocked
            ? "bg-token-surface-stripe cursor-not-allowed mx-2 opacity-80"
            : isJustified
              ? "bg-purple-50/20 dark:bg-purple-900/10 cursor-help mx-2"
              : "bg-token-surface-card cursor-pointer hover:border-token-accent-brand transition-colors mx-2"
        }`}
        onDoubleClick={() => !isLocked && !isJustified && onRowDoubleClick(record)}
      >
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              {pendingRequest && (
                <ExclamationTriangleIcon className="w-3.5 h-3.5 text-token-status-warning" />
              )}
              <p
                data-list-role="primary"
                className="typo-list-primary text-token-text-primary uppercase tracking-tight"
              >
                {record.employeeName}
              </p>
            </div>
            <p
              data-list-role="secondary"
              className="typo-list-secondary text-token-text-tertiary uppercase tracking-wider"
            >
              {record.employeeArea}
            </p>
          </div>
          <span
            data-list-role="status"
            className={`typo-list-status px-3 py-1 rounded-md uppercase tracking-wide border border-token-border-subtle ${statusConfig.bg} ${statusConfig.text}`}
          >
            {statusConfig.label}
          </span>
        </div>
        <div className="mt-3 pt-3 border-t border-token-border-subtle">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-token-text-secondary">
            <p className="typo-list-value">
              <span className="typo-list-secondary">Entrada:</span>{" "}
              {formatDisplayDateTime(record.entrada)}
            </p>
            <p className="typo-list-value">
              <span className="typo-list-secondary">Salida:</span>{" "}
              {formatDisplayDateTime(record.salida)}
            </p>
            <p className="typo-list-value">
              <span className="typo-list-secondary">Ini. Colación:</span>{" "}
              {formatDisplayDateTime(record.inicioColacion)}
            </p>
            <p className="typo-list-value">
              <span className="typo-list-secondary">Fin Colación:</span>{" "}
              {formatDisplayDateTime(record.finColacion)}
            </p>
          </div>
        </div>
        <div className="flex justify-end items-center mt-3 pt-3 border-t border-token-border-subtle space-x-3">
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
              className="h-10 px-4 bg-token-accent-brand text-white rounded-md border-none shadow-sm font-black uppercase tracking-widest text-[10px]"
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
