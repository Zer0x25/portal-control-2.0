import React from "react";
import { useHealthQuery } from "../../hooks/queries/useHealthQuery";
import { ServerIcon, CpuChipIcon, CircleStackIcon, ActivityIcon } from "../ui/icons/index";

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  status?: "good" | "warning" | "error";
}> = ({ title, value, unit, icon, status = "good" }) => (
  <div className="bg-[#fdfbf7] dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-md p-4 shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <span className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-[0.15em]">
        {title}
      </span>
      <div
        className={`p-1.5 rounded-md ${
          status === "good"
            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : status === "warning"
              ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
              : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
        }`}
      >
        {icon}
      </div>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-2xl font-black text-slate-900 dark:text-white">{value}</span>
      {unit && (
        <span className="text-gray-400 dark:text-gray-500 text-xs font-black uppercase tracking-widest">
          {unit}
        </span>
      )}
    </div>
  </div>
);

type DetailRowValue = string | number | React.ReactNode;

const HealthDashboard: React.FC = () => {
  const {
    data,
    isLoading: loading,
    error: queryError,
  } = useHealthQuery({ refetchInterval: 30000 });
  const error = queryError ? (queryError as Error).message : null;

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-white"></div>
      </div>
    );
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hrs = Math.floor((seconds % (3600 * 24)) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hrs}h ${mins}m`;
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleString("es-CL");
  };

  const backup = data?.backup;
  const backupStatusLabel = !backup?.enabled
    ? "DESHABILITADO"
    : backup.stale
      ? "STALE"
      : backup.lastError
        ? "ERROR"
        : "OK";
  const backupStatusTone = !backup?.enabled
    ? "bg-gray-500 text-white"
    : backup.stale || backup.lastError
      ? "bg-rose-500 text-white"
      : "bg-emerald-500 text-white";

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Estado del Sistema
          </h2>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Metricas en tiempo real de infraestructura y base de datos
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-md shadow-sm text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">
          <div
            className={`w-2 h-2 rounded-full animate-pulse ${data?.status === "healthy" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"}`}
          ></div>
          {data?.status === "healthy" ? "SISTEMA OPERATIVO" : "SISTEMA DEGRADADO"}
        </div>
      </header>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-md text-rose-700 dark:text-rose-400 text-sm font-bold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Latencia DB"
          value={data?.database.latency || 0}
          unit="ms"
          status={(data?.database.latency || 0) > 100 ? "warning" : "good"}
          icon={<CircleStackIcon className="w-4 h-4" />}
        />
        <MetricCard
          title="Tiempo de Respuesta"
          value={data?.responseTime || 0}
          unit="ms"
          status={(data?.responseTime || 0) > 250 ? "warning" : "good"}
          icon={<ServerIcon className="w-4 h-4" />}
        />
        <MetricCard
          title="Uso de Memoria (Heap)"
          value={data?.system.memory.heapUsed || 0}
          unit="MB"
          status={(data?.system.memory.heapUsed || 0) > 500 ? "warning" : "good"}
          icon={<CpuChipIcon className="w-4 h-4" />}
        />
        <MetricCard
          title="Uptime Servidor"
          value={formatUptime(data?.uptime || 0)}
          icon={<ActivityIcon className="w-4 h-4" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#fdfbf7] dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-md overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-gray-100 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-800 font-black text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
            Detalle del Entorno
          </div>
          <div className="p-4 space-y-3">
            <DetailRow label="Node.js Version" value={data?.system.nodeVersion} />
            <DetailRow
              label="Plataforma"
              value={`${data?.system.platform} (${data?.system.arch})`}
            />
            <DetailRow label="Procesador (Hilos)" value={`${data?.system.cpus} vCPU`} />
            <DetailRow
              label="Memoria OS Disponible"
              value={`${data?.system.os.freeMem} / ${data?.system.os.totalMem} MB`}
            />
            <DetailRow
              label="Carga CPU (1, 5, 15m)"
              value={
                data?.system.platform === "win32"
                  ? "N/A en Windows"
                  : data?.system.os.loadAvg.map((n) => n.toFixed(2)).join(", ")
              }
            />
          </div>
        </div>

        <div className="bg-[#fdfbf7] dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-md overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-gray-100 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-800 font-black text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
            Riesgo Operativo (SLO)
          </div>
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-700 dark:text-gray-300 font-black uppercase text-[10px] tracking-tight">
                Estado de Backup
              </span>
              <span
                className={`px-3 py-1 rounded-md text-[9px] font-black tracking-widest ${backupStatusTone}`}
              >
                {backupStatusLabel}
              </span>
            </div>

            <DetailRow
              label="Modo de Respaldo"
              value={
                backup?.mode || (backup?.isScheduledEnabled ? "AUTOMATICO" : "MANUAL / EXTERNO")
              }
            />
            <DetailRow
              label="Edad Ultimo Backup"
              value={
                backup?.enabled ? `${backup.latestFileAgeHours ?? "N/A"} h` : "No aplica (disabled)"
              }
            />
            <DetailRow label="Umbral Stale" value={`${backup?.staleThresholdHours ?? "N/A"} h`} />
            <DetailRow
              label="Ultimo Backup Exitoso"
              value={formatDateTime(backup?.latestFileAt || backup?.lastSuccessAt)}
            />
            <DetailRow label="Tamaño Ultimo Backup" value={backup?.latestFileSize || "N/A"} />
            <DetailRow
              label="Total Backups"
              value={
                <span className="flex items-center gap-1 justify-end">
                  {backup?.backupCount ?? 0}
                  {backup?.backupCount && backup.backupCount > 0 && (
                    <CircleStackIcon className="w-3 h-3 text-indigo-500" />
                  )}
                </span>
              }
            />

            <DetailRow label="Ultimo Intento" value={formatDateTime(backup?.lastAttemptAt)} />
            <DetailRow label="Error de Backup" value={backup?.lastError || "Sin errores"} />
            <DetailRow label="Tamano Base de Datos" value={data?.database.size || "..."} />
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailRow: React.FC<{ label: string; value: DetailRowValue }> = ({ label, value }) => (
  <div className="flex justify-between items-center text-sm py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
    <span className="text-gray-500 dark:text-gray-400 font-medium uppercase text-[10px] tracking-widest">
      {label}
    </span>
    <span className="font-mono text-slate-900 dark:text-white text-right font-black italic">
      {value}
    </span>
  </div>
);

export default HealthDashboard;
