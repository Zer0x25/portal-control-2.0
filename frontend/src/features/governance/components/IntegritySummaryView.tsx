import React, { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import Card from "../../../components/ui/Card";
import KpiCard, { KpiStat } from "../../../components/ui/KpiCard";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import {
  ShieldCheckIcon,
  FingerPrintIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CircleStackIcon,
  ClockIcon,
} from "../../../components/ui/icons/index";
import { useIntegrityStatus } from "../../../hooks/queries/useIntegrityStatus";
import { useAuditLogsInfinite } from "../../../hooks/queries/useAuditLogsInfinite";
import { useAuditLogMutations } from "../../../hooks/useAuditLogMutations";
import IntegrityAnomalyTable from "./IntegrityAnomalyTable";

const IntegritySummaryView: React.FC = () => {
  const tableRef = React.useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { data: status } = useIntegrityStatus();
  const { verifyIntegrity } = useAuditLogMutations();

  // Fetch critical integrity logs
  const { data: logsData, isLoading: isLoadingLogs } = useAuditLogsInfinite({
    pageSize: 50,
    filters: {
      category: ["CTRL_HOURS", "SECURITY"],
      severity: ["CRITICAL", "HIGH"],
    },
    sortBy: "timestamp",
    sortOrder: "desc",
  });

  const allLogs = useMemo(
    () => logsData?.pages.flatMap((page) => page.data || []) || [],
    [logsData],
  );

  const handleManualVerify = () => {
    verifyIntegrity.mutate();
  };

  const scrollToTable = () => {
    tableRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["integrityStatus"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-token-text-primary uppercase tracking-tight">
            Estado de Salud Criptográfica
          </h3>
          <p className="text-[11px] text-token-text-tertiary">
            Análisis de consistencia del sellado digital en base de datos
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={handleRefresh}
            className="h-10 px-4 rounded-sm border border-token-border-technical"
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Sincronizar Panel
          </Button>
          <Button
            variant="primary"
            onClick={handleManualVerify}
            loading={verifyIntegrity.isPending}
            className="rounded-sm font-semibold uppercase tracking-wider text-[11px] px-6 h-10 shadow-lg shadow-(--sidebar-text-active)/20"
          >
            {!verifyIntegrity.isPending && <ArrowPathIcon className="w-4 h-4 mr-2" />}
            Ejecutar Auditoría Profunda
          </Button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Salud de Datos"
          icon={
            <ShieldCheckIcon
              className={status?.status === "ok" ? "text-sap-success" : "text-sap-error"}
            />
          }
        >
          <KpiStat
            label="Estado Global"
            value={status?.status === "ok" ? "INTEGRA" : "DEGRADADA"}
            isActive={status?.status === "degraded"}
            onClick={handleRefresh}
          />
          <KpiStat
            label="Estado del Sello"
            value={status?.status === "ok" ? "Protección Activa" : "Vulnerable"}
          />
        </KpiCard>

        <KpiCard title="Carga Operativa" icon={<CircleStackIcon className="text-sap-blue" />}>
          <KpiStat
            label="Registros Verificados"
            value={status?.lastCheckedCount?.toLocaleString() || "0"}
          />
          <KpiStat
            label="Última Verificación"
            value={status?.lastRunAt ? format(new Date(status.lastRunAt), "HH:mm") : "--:--"}
          />
        </KpiCard>

        <KpiCard
          title="Amenazas Detectadas"
          icon={
            <FingerPrintIcon
              className={
                status?.lastBrokenCount && status.lastBrokenCount > 0
                  ? "text-sap-error"
                  : "text-token-text-tertiary"
              }
            />
          }
        >
          <KpiStat
            label="Corrupciones"
            value={status?.lastBrokenCount?.toString() || "0"}
            isActive={!!status?.lastBrokenCount && status.lastBrokenCount > 0}
            onClick={scrollToTable}
          />
          <KpiStat
            label="Discrepancias Hash"
            value={status?.lastBrokenByReason?.hashMismatch || 0}
            onClick={scrollToTable}
          />
        </KpiCard>

        <KpiCard
          title="Mantenimiento Digital"
          icon={<ArrowPathIcon className="text-sap-warning" />}
        >
          <KpiStat
            label="Último Backfill"
            value={
              status?.lastBackfillAt ? format(new Date(status.lastBackfillAt), "HH:mm") : "--:--"
            }
          />
          <KpiStat label="Registros Reparados" value={status?.lastBackfillProcessed || 0} />
        </KpiCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Integrity Details Card */}
        <Card className="lg:col-span-1 space-y-6">
          <div className="flex items-center justify-between border-b token-border-technical pb-4">
            <h3 className="text-sm font-bold text-token-text-primary uppercase tracking-tight flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-token-text-tertiary" />
              Sello Digital (V3.5)
            </h3>
            <Badge variant={status?.status === "ok" ? "success" : "danger"} size="sm" showDot>
              {status?.status === "ok" ? "Sincronizado" : "Anomalía"}
            </Badge>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold text-token-text-tertiary uppercase tracking-widest mb-1.5">
                Regla de Encadenamiento
              </p>
              <div className="flex items-center gap-2 p-3 bg-token-surface-stripe border border-token-border-subtle rounded-sm">
                <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_indigo]" />
                <span className="text-[11px] font-mono text-token-text-primary">
                  SHA-256 HMAC (Chain Mode)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-3 bg-token-surface-stripe rounded-sm border border-token-border-subtle">
                <p className="text-[9px] font-bold text-token-text-tertiary uppercase mb-1">
                  Hash Mismatch
                </p>
                <p className="text-lg font-bold text-token-text-primary leading-none">
                  {status?.lastBrokenByReason?.hashMismatch || 0}
                </p>
              </div>
              <div className="p-3 bg-token-surface-stripe rounded-sm border border-token-border-subtle">
                <p className="text-[9px] font-bold text-token-text-tertiary uppercase mb-1">
                  Chain Broken
                </p>
                <p className="text-lg font-bold text-token-text-primary leading-none">
                  {status?.lastBrokenByReason?.prevHashMismatch || 0}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t token-border-subtle">
              <p className="text-[10px] font-medium text-token-text-secondary leading-relaxed italic">
                Cualquier modificación vía SQL sin procesar los hashes romperá la secuencia de
                seguridad y será detectada en el próximo escaneo.
              </p>
            </div>
          </div>
        </Card>

        {/* Anomalies Table Card */}
        <Card ref={tableRef} className="lg:col-span-2 p-0! overflow-hidden" noPadding>
          <div className="p-4 bg-token-surface-stripe border-b token-border-technical flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-sap-error" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-token-text-secondary">
                Alertas de Integridad Detectadas (Últimos 50 eventos)
              </span>
            </div>
            {isLoadingLogs && (
              <Badge variant="info" size="sm" showDot>
                Cargando...
              </Badge>
            )}
          </div>
          <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
            <IntegrityAnomalyTable logs={allLogs} isLoading={isLoadingLogs} />
          </div>
        </Card>
      </div>

      {/* Extra Info Banner */}
      {status?.status === "degraded" && (
        <div className="p-5 bg-sap-error/5 border border-sap-error/20 rounded-sm flex items-start gap-4 animate-in fade-in zoom-in-95">
          <div className="p-2 bg-sap-error/10 rounded-full">
            <ExclamationTriangleIcon className="w-5 h-5 text-sap-error" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-sap-error uppercase tracking-tight">
              Atención: Integridad Comprometida
            </h4>
            <p className="text-xs text-token-text-secondary mt-1 max-w-2xl leading-relaxed">
              Se han detectado {status.lastBrokenCount} discrepancias. Esto suele indicar ediciones
              directas en SQL. Ejecute la auditoría manual para registrar el alcance total de los
              daños.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegritySummaryView;
