import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AuditLog } from "../../../types/index";
import Badge from "../../../components/ui/Badge";
import Card from "../../../components/ui/Card";
import EmptyState from "../../../components/ui/EmptyState";
import {
  FingerPrintIcon,
  ExclamationTriangleIcon,
  CircleStackIcon,
} from "../../../components/ui/icons/index";

interface IntegrityAnomalyTableProps {
  logs: AuditLog[];
  isLoading: boolean;
}

const IntegrityAnomalyTable: React.FC<IntegrityAnomalyTableProps> = ({ logs, isLoading }) => {
  if (!isLoading && logs.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center p-12 border-dashed">
        <EmptyState
          title="Sin anomalías de integridad"
          description="No se han detectado violaciones de seguridad o corrupción de datos en el periodo analizado."
          icon={<FingerPrintIcon className="w-12 h-12 text-sap-success/50" />}
        />
      </Card>
    );
  }

  const getAnomalyIcon = (action: string) => {
    switch (action) {
      case "INTEGRITY_VIOLATION_DETECTED":
        return <ExclamationTriangleIcon className="w-4 h-4 text-sap-error" />;
      case "TIME_RECORD_INTEGRITY_BROKEN":
      case "TIME_RECORD_INTEGRITY_BROKEN_BULK":
        return <FingerPrintIcon className="w-4 h-4 text-sap-error" />;
      default:
        return <CircleStackIcon className="w-4 h-4 text-sap-warning" />;
    }
  };

  const renderDetails = (details: Record<string, unknown> | null | undefined) => {
    if (!details) return null;

    return (
      <div className="mt-2 p-3 bg-token-surface-stripe rounded-sm border border-token-border-subtle font-mono text-[10px] space-y-1">
        {details.message && (
          <p className="font-semibold text-token-text-secondary">{String(details.message)}</p>
        )}
        {details.recordId && <p>ID Registro: {String(details.recordId)}</p>}
        {details.employeeName && <p>Empleado: {String(details.employeeName)}</p>}
        {details.reason && (
          <p className="text-sap-error">
            Motivo: <span className="font-bold">{String(details.reason)}</span>
          </p>
        )}
        {details.expectedHash && (
          <p className="truncate">
            Hash Esperado: <span className="text-sap-success">{String(details.expectedHash)}</span>
          </p>
        )}
        {details.actualHash && (
          <p className="truncate">
            Hash Real: <span className="text-sap-error">{String(details.actualHash)}</span>
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="overflow-x-auto rounded-sm border token-border-technical">
      <table className="w-full text-left border-collapse bg-token-surface-card">
        <thead>
          <tr className="bg-token-surface-stripe border-b token-border-technical">
            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-token-text-secondary">
              Fecha / Hora
            </th>
            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-token-text-secondary">
              Acción / Severidad
            </th>
            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-token-text-secondary">
              Empleado / Referencia
            </th>
            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-token-text-secondary">
              Detalles Técnicos
            </th>
          </tr>
        </thead>
        <tbody className="divide-y token-border-subtle">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={4} className="px-4 py-8 h-12 bg-token-surface-stripe/20" />
                </tr>
              ))
            : logs.map((log) => (
                <tr key={log.id} className="hover:bg-token-surface-stripe/40 transition-colors">
                  <td className="px-4 py-3 align-top whitespace-nowrap">
                    <div className="text-[12px] font-medium text-token-text-primary">
                      {format(new Date(log.timestamp), "dd MMM yyyy", { locale: es })}
                    </div>
                    <div className="text-[10px] text-token-text-tertiary">
                      {format(new Date(log.timestamp), "HH:mm:ss")}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-1.5 items-start">
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-token-text-primary uppercase tracking-tight">
                        {getAnomalyIcon(log.action)}
                        {log.action.replace(/_/g, " ")}
                      </div>
                      <Badge variant={log.severity === "CRITICAL" ? "danger" : "warning"} size="sm">
                        {log.severity}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="text-[12px] text-token-text-secondary">
                      {((log.details as Record<string, unknown>)?.employeeName as string) ||
                        "Sistema / Global"}
                    </div>
                    <div className="text-[10px] text-token-text-tertiary font-mono">
                      {((log.details as Record<string, unknown>)?.recordId as string) || "-"}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top max-w-md">
                    {renderDetails(log.details as Record<string, unknown>)}
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
};

export default IntegrityAnomalyTable;
