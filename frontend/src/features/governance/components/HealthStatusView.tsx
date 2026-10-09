import React from "react";
import { format } from "date-fns";
import Card from "../../../components/ui/Card";
import KpiCard, { KpiStat } from "../../../components/ui/KpiCard";
import Badge from "../../../components/ui/Badge";
import {
  ActivityIcon,
  CircleStackIcon,
  CpuChipIcon,
  ServerIcon,
  ShieldCheckIcon,
  ClockIcon,
  ArrowPathIcon,
} from "../../../components/ui/icons/index";
import { useHealthQuery } from "../../../hooks/queries/useHealthQuery";

const HealthStatusView: React.FC = () => {
  const { data: health, isLoading, refetch } = useHealthQuery({ refetchInterval: 30000 });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-token-text-primary"></div>
      </div>
    );
  }

  const isHealthy = health?.status === "healthy";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-token-text-primary uppercase tracking-tight">
            Monitor de Salud del Sistema
          </h3>
          <p className="text-[11px] text-token-text-tertiary">
            Métricas de infraestructura, base de datos y rendimiento en tiempo real
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-token-text-secondary hover:text-token-text-primary transition-colors border border-token-border-technical rounded-sm"
          >
            <ArrowPathIcon className="w-3 h-3" />
            Refrescar Datos
          </button>
        </div>
      </div>

      {/* Main KPI Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Estado Global"
          icon={<ActivityIcon className={isHealthy ? "text-sap-success" : "text-sap-error"} />}
        >
          <KpiStat
            label="Sistema"
            value={isHealthy ? "OPERATIVO" : "DEGRADADO"}
            isActive={!isHealthy}
          />
          <KpiStat label="Respuesta API" value={`${health?.responseTime || 0} ms`} />
        </KpiCard>

        <KpiCard title="Base de Datos" icon={<CircleStackIcon className="text-sap-blue" />}>
          <KpiStat
            label="Latencia Query"
            value={`${health?.database?.latency || 0} ms`}
            isActive={(health?.database?.latency || 0) > 100}
          />
          <KpiStat label="Tamaño DB" value={health?.database?.size || "---"} />
        </KpiCard>

        <KpiCard title="Recursos Server" icon={<CpuChipIcon className="text-sap-warning" />}>
          <KpiStat
            label="Memoria Node (Heap)"
            value={`${health?.system?.memory?.heapUsed || 0} MB`}
          />
          <KpiStat
            label="Uptime"
            value={`${Math.floor((health?.uptime || 0) / 3600)}h ${Math.floor(((health?.uptime || 0) % 3600) / 60)}m`}
          />
        </KpiCard>

        <KpiCard
          title="Integridad & Seguridad"
          icon={<ShieldCheckIcon className="text-indigo-500" />}
        >
          <KpiStat
            label="Health Score"
            value={`${
              health?.integrity?.lastCheckedCount
                ? Math.round(
                    ((health.integrity.lastCheckedCount - health.integrity.lastBrokenCount) /
                      health.integrity.lastCheckedCount) *
                      100,
                  )
                : 100
            }%`}
          />
          <KpiStat
            label="Integridad"
            value={health?.integrity?.status === "ok" ? "OK" : "CHECK"}
            isActive={health?.integrity?.status !== "ok"}
          />
        </KpiCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Details Card */}
        <Card className="lg:col-span-1 space-y-6">
          <div className="flex items-center justify-between border-b token-border-technical pb-4">
            <h3 className="text-sm font-bold text-token-text-primary uppercase tracking-tight flex items-center gap-2">
              <ServerIcon className="w-4 h-4 text-token-text-tertiary" />
              Infraestructura
            </h3>
            <Badge variant="info" size="sm">
              v{health?.system?.nodeVersion || "---"}
            </Badge>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-token-text-secondary font-medium uppercase tracking-wider">
                Plataforma
              </span>
              <span className="text-token-text-primary font-bold">
                {health?.system?.platform || "---"} ({health?.system?.arch || "---"})
              </span>
            </div>

            <div className="flex justify-between items-center text-[11px]">
              <span className="text-token-text-secondary font-medium uppercase tracking-wider">
                CPUs
              </span>
              <span className="text-token-text-primary font-bold">
                {health?.system?.cpus || 0} Núcleos
              </span>
            </div>

            <div className="pt-4 border-t token-border-technical">
              <p className="text-[10px] font-bold text-token-text-tertiary uppercase tracking-widest mb-3">
                Uso de Memoria (RAM)
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-token-text-secondary italic">OS Free Memory</span>
                    <span className="text-token-text-primary font-mono">
                      {health?.system?.os?.freeMem || 0} / {health?.system?.os?.totalMem || 0} MB
                    </span>
                  </div>
                  <div className="h-1 bg-token-border-subtle overflow-hidden rounded-full">
                    <div
                      style={{
                        width: `${100 - ((health?.system?.os?.freeMem || 0) / (health?.system?.os?.totalMem || 1)) * 100}%`,
                      }}
                      className="h-full bg-sap-blue shadow-[0_0_8px_rgba(4,105,255,0.4)] transition-[width] duration-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Backups & Persistence */}
        <Card className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b token-border-technical pb-4">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-4 h-4 text-sap-success" />
              <h3 className="text-sm font-bold text-token-text-primary uppercase tracking-tight">
                Continuidad de Negocio
              </h3>
            </div>
            {health?.backup?.enabled ? (
              <Badge variant={health.backup?.stale ? "warning" : "success"} size="sm" showDot>
                {health.backup?.stale ? "Respaldo Atrasado" : "Respaldo al día"}
              </Badge>
            ) : (
              <Badge variant="neutral" size="sm">
                Backups Deshabilitados
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-token-text-tertiary uppercase tracking-widest mb-1.5">
                  Último Respaldo Exitoso
                </p>
                <div className="p-3 bg-token-surface-stripe border border-token-border-subtle rounded-sm">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="w-3.5 h-3.5 text-token-text-secondary" />
                    <span className="text-[11px] font-mono font-bold text-token-text-primary">
                      {health?.backup?.lastSuccessAt
                        ? format(new Date(health.backup.lastSuccessAt), "dd/MM/yyyy HH:mm:ss")
                        : "Nunca"}
                    </span>
                  </div>
                </div>
              </div>
              {health?.backup?.lastError && (
                <div className="p-3 bg-sap-error/5 border border-sap-error/20 rounded-sm">
                  <p className="text-[9px] font-bold text-sap-error uppercase mb-1">
                    Error Detectado
                  </p>
                  <p className="text-[10px] text-sap-error leading-tight font-medium italic">
                    {health.backup?.lastError}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-bold text-token-text-tertiary uppercase tracking-widest leading-relaxed">
                Estado del Sello de Integridad
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-token-surface-stripe rounded-sm border border-token-border-technical">
                  <div className="p-1.5 bg-indigo-500/10 rounded-full">
                    <ShieldCheckIcon className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-token-text-primary uppercase">
                      Hash Chaining
                    </p>
                    <p className="text-[10px] text-token-text-tertiary mt-0.5">
                      La cadena de bloques criptográfica está{" "}
                      {health?.status === "healthy" ? "intacta" : "comprometida"}.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t token-border-technical">
            <div className="flex items-center gap-4 text-[10px] text-token-text-tertiary italic">
              <ActivityIcon className="w-3.5 h-3.5" />
              <span>
                Las métricas se actualizan automáticamente cada 30 segundos. El tiempo de respuesta
                incluye el roundtrip de red completo.
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default HealthStatusView;
