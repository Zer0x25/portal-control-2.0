import React from "react";
import {
  DailyTimeRecord,
  TimeRecordField,
  AugmentedTimeRecord,
  AuditLog,
  CorrectionRequest,
} from "../../../types/index";
import {
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
  DeleteIcon,
  ArrowPathIcon,
} from "../../../components/ui/icons/index";
import {
  formatDisplayDateTime,
  formatLogTimestamp,
  formatDisplayDate,
} from "../../../utils/formatters";
import Button from "../../../components/ui/Button";
import { useTimeRecordRowController } from "../hooks/useTimeRecordRowController";

interface TimeRecordRowProps {
  record: AugmentedTimeRecord;
  onRowDoubleClick: (record: AugmentedTimeRecord) => void;
  onAddComment: (record: DailyTimeRecord) => void;
  onDelete: (record: DailyTimeRecord) => void;
  isActionDisabledForRole: boolean;
  roleBasedTooltip: string;
  accountingLockDate: string | null;
  isControlInternoEnabled: boolean;
  onViewHistory: (record: DailyTimeRecord) => void;
  layoutMode?: "table-row" | "table-row-div";
  externalEdits?: AuditLog[];
  externalPendingRequest?: CorrectionRequest;
}

const TimeRecordRow: React.FC<TimeRecordRowProps> = React.memo(
  ({
    record,
    onRowDoubleClick,
    onAddComment,
    onDelete,
    isActionDisabledForRole,
    roleBasedTooltip,
    accountingLockDate,
    isControlInternoEnabled,
    onViewHistory,
    layoutMode = "table-row",
    externalEdits,
    externalPendingRequest,
  }) => {
    const {
      finalTooltip,
      getCellEditInfo,
      isJustified,
      isLocked,
      pendingRequest,
      progressPercent,
      statusConfig,
      statusVisualConfig,
    } = useTimeRecordRowController({
      record,
      accountingLockDate,
      roleBasedTooltip,
      externalEdits,
      externalPendingRequest,
    });

    const renderTimestampCell = (field: TimeRecordField, widthClass: string) => {
      const editInfo = getCellEditInfo(field);
      const value = record[field];
      const isSinRegistro = value === "SIN REGISTRO";

      const content = (
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span
            className={`text-xs font-black font-mono italic tracking-tighter truncate ${isSinRegistro ? "text-token-status-error opacity-50" : "text-token-text-primary"}`}
          >
            {formatDisplayDateTime(value).split(" ")[1] || "--:--"}
          </span>
          {editInfo && (
            <div
              className="p-0.5 bg-token-status-warning/10 rounded-full cursor-help shrink-0"
              title={`Editado por ${editInfo.actor} el ${formatLogTimestamp(editInfo.timestamp)}. Valor original: ${formatDisplayDateTime(editInfo.oldValue)}`}
            >
              <ExclamationTriangleIcon className="w-3 h-3 text-token-status-warning" />
            </div>
          )}
        </div>
      );

      return layoutMode === "table-row" ? (
        <td className="px-3 py-4 whitespace-nowrap">{content}</td>
      ) : (
        <div className={`px-3 py-4 flex items-center ${widthClass}`}>{content}</div>
      );
    };

    const rowClassName = `
      transition-[background-color,transform,opacity] duration-200 group w-full shrink-0
      ${
        isLocked
          ? "bg-token-surface-stripe cursor-not-allowed opacity-60"
          : isJustified
            ? "bg-purple-50/50 dark:bg-purple-900/10 hover:bg-token-surface-hover cursor-help"
            : "hover:bg-token-surface-hover cursor-pointer"
      }
    `;

    const commonProps = {
      onDoubleClick: () => !isLocked && onRowDoubleClick(record),
      title: isLocked
        ? finalTooltip
        : isJustified
          ? finalTooltip
          : "Doble click para acciones rápidas",
    };

    if (layoutMode === "table-row-div") {
      return (
        <div className={`${rowClassName} flex items-center h-full`} {...commonProps}>
          {/* Área - 12% */}
          <div className="w-[12%] px-4 py-4 hidden sm:flex flex-col gap-1.5">
            <span className="font-bold text-token-text-tertiary text-[9px] uppercase tracking-wider truncate">
              {record.employeeArea}
            </span>
          </div>
          {/* Nombre - 20% */}
          <div className="w-[20%] px-4 py-4 flex items-center gap-2 overflow-hidden">
            <div className="relative shrink-0">
              {statusConfig && (
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusConfig.dot} shadow-lg shadow-current/20 border border-white/20`}
                  title={statusConfig.label}
                />
              )}
              {pendingRequest && (
                <div className="absolute -top-1 -right-1">
                  <ExclamationTriangleIcon className="w-3.5 h-3.5 text-token-status-warning drop-shadow-sm" />
                </div>
              )}
            </div>
            <span className="font-bold text-token-text-primary text-xs truncate">
              {record.employeeName}
            </span>
          </div>
          {/* Fecha - 10% */}
          <div className="w-[10%] px-4 py-4">
            <span className="text-xs font-black font-mono text-gray-700 dark:text-gray-300 tracking-tighter uppercase tabular-nums truncate">
              {formatDisplayDate(record.date)}
            </span>
          </div>
          {/* Horas - 8% cada una */}
          {renderTimestampCell("entrada", "w-[8%]")}
          {renderTimestampCell("inicioColacion", "w-[8%]")}
          {renderTimestampCell("finColacion", "w-[8%]")}
          {renderTimestampCell("salida", "w-[8%]")}
          {/* Estado - 10% */}
          <div className="w-[10%] px-3 py-4 flex items-center">
            <span
              className={`
                 px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-md border border-token-border-subtle shadow-sm truncate
                 ${statusVisualConfig.bg}
                 ${statusVisualConfig.text}
               `}
            >
              {statusVisualConfig.label}
            </span>
          </div>
          {/* Acciones - 16% */}
          <div className="w-[16%] px-4 py-4 flex items-center justify-end gap-2">
            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-[opacity,transform,background-color] duration-300">
              {isControlInternoEnabled && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddComment(record);
                  }}
                  disabled={!!(isActionDisabledForRole || isJustified || isLocked)}
                  className="p-1.5!"
                >
                  <ChatBubbleLeftRightIcon className="w-4 h-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewHistory(record);
                }}
                className="p-1.5!"
              >
                <ArrowPathIcon className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(record);
                }}
                disabled={!!(isActionDisabledForRole || isJustified || isLocked)}
                className="p-1.5!"
              >
                <DeleteIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <tr className={rowClassName} {...commonProps}>
        <td className="px-4 py-4 whitespace-nowrap text-sm hidden sm:table-cell">
          <div className="flex flex-col gap-1.5">
            <span className="font-bold text-token-text-tertiary text-[9px] uppercase tracking-wider">
              {record.employeeArea}
            </span>
            {["Laborando", "Colacion"].includes(record.status) && progressPercent > 0 && (
              <div
                className="w-16 h-1 bg-gray-200/50 dark:bg-gray-700/30 rounded-full overflow-hidden border border-white/10"
                title={`${progressPercent}% de jornada completada`}
              >
                <div
                  className="h-full bg-linear-to-r from-sap-blue to-blue-400 shadow-[0_0_8px_rgba(0,102,204,0.4)] transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}
          </div>
        </td>
        <td className="px-4 py-4 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <div className="relative">
              {statusConfig && (
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusConfig.dot} shadow-lg shadow-current/20 border border-white/20`}
                  title={statusConfig.label}
                />
              )}
              {pendingRequest && (
                <div className="absolute -top-1 -right-1">
                  <ExclamationTriangleIcon className="w-3.5 h-3.5 text-token-status-warning drop-shadow-sm" />
                </div>
              )}
            </div>
            <span className="font-bold text-token-text-primary text-xs">{record.employeeName}</span>
          </div>
        </td>
        <td className="px-4 py-4 whitespace-nowrap">
          <span className="text-xs font-black font-mono text-gray-700 dark:text-gray-300 tracking-tighter uppercase tabular-nums">
            {formatDisplayDate(record.date)}
          </span>
        </td>
        {renderTimestampCell("entrada", "")}
        {renderTimestampCell("inicioColacion", "")}
        {renderTimestampCell("finColacion", "")}
        {renderTimestampCell("salida", "")}
        <td className="px-3 py-4 whitespace-nowrap">
          <span
            className={`
          px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-md border border-token-border-subtle shadow-sm
          ${statusVisualConfig.bg}
          ${statusVisualConfig.text}
        `}
          >
            {statusVisualConfig.label}
          </span>
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-right min-w-[140px]">
          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
            {isControlInternoEnabled && (
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddComment(record);
                }}
                disabled={!!(isActionDisabledForRole || isJustified || isLocked)}
                title="Agregar novedad"
                className="p-2! shadow-md rounded-md border-sap-blue/30 bg-blue-50 dark:bg-sap-blue/20 text-sap-blue hover:bg-sap-blue hover:text-white transition-all"
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4 stroke-[2.5px]" />
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onViewHistory(record);
              }}
              title="Ver historial de cambios"
              className="p-2! shadow-md rounded-md border-indigo-200 dark:border-indigo-900/40 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all"
            >
              <ArrowPathIcon className="w-4 h-4 stroke-[2.5px]" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(record);
              }}
              disabled={!!(isActionDisabledForRole || isJustified || isLocked)}
              title="Eliminar registro"
              className="p-2! shadow-md rounded-md border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-600 hover:text-white transition-all"
            >
              <DeleteIcon className="w-4 h-4 stroke-[2.5px]" />
            </Button>
          </div>
        </td>
      </tr>
    );
  },
);

export default TimeRecordRow;
