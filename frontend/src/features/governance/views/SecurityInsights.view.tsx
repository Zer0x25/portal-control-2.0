import React from "react";
import {
  ShieldIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from "../../../components/ui/icons";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import Badge from "../../../components/ui/Badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { AuditLog } from "../../../types";

interface SecurityStats {
  totalUsers: number;
  mfaUsers: number;
  mfaAdoption: number;
  criticalAlertsCount: number;
}

export interface SecurityInsightsViewProps {
  loading: boolean;
  stats: SecurityStats | null;
  alerts: AuditLog[];
  fetchInsights: () => Promise<void>;
}

export const SecurityInsightsView: React.FC<SecurityInsightsViewProps> = ({
  loading,
  stats,
  alerts,
  fetchInsights,
}) => {
  if (loading && !stats) {
    return (
      <div className="p-8 text-center text-token-text-tertiary font-bold uppercase text-[11px] tracking-widest animate-pulse">
        Cargando inteligencia de seguridad...
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-token-text-primary uppercase tracking-tight">
            Vigilancia & Riesgos
          </h3>
          <p className="text-[11px] text-token-text-tertiary">
            Monitor de adopción de seguridad y denegaciones críticas
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={fetchInsights}
          loading={loading}
          className="h-10 px-4 rounded-sm border border-token-border-technical"
        >
          <ArrowPathIcon className="w-4 h-4 mr-2" />
          Actualizar Insights
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          className="p-6! cursor-pointer hover:border-sap-blue transition-all active:scale-[0.98]"
          onClick={fetchInsights}
          title="Haz clic para actualizar insights"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-500/10 rounded-sm border border-indigo-500/20">
              <ShieldIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-token-text-tertiary uppercase tracking-widest leading-none mb-1">
                Cobertura MFA
              </p>
              <p className="text-2xl font-black text-token-text-primary">
                {stats.mfaAdoption.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="w-full bg-token-surface-stripe h-2 rounded-full overflow-hidden border border-token-border-subtle">
            <div
              className={`h-full transition-all duration-1000 ${
                stats.mfaAdoption > 80
                  ? "bg-sap-success"
                  : stats.mfaAdoption > 50
                    ? "bg-sap-warning"
                    : "bg-sap-error"
              }`}
              style={{ width: `${stats.mfaAdoption}%`, boxShadow: "0 0 10px currentColor" }}
            />
          </div>
          <p className="mt-3 text-[10px] text-token-text-secondary font-bold uppercase tracking-tight opacity-70">
            {stats.mfaUsers} de {stats.totalUsers} admin protegidos.
          </p>
        </Card>

        <Card
          className="p-6! cursor-pointer hover:border-sap-blue transition-all active:scale-[0.98]"
          onClick={fetchInsights}
          title="Haz clic para actualizar insights"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/10 rounded-sm border border-red-500/20">
              <ExclamationTriangleIcon className="w-6 h-6 text-sap-error" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-token-text-tertiary uppercase tracking-widest leading-none mb-1">
                Alertas Críticas
              </p>
              <p className="text-2xl font-black text-token-text-primary">
                {stats.criticalAlertsCount}
              </p>
            </div>
          </div>
          <p className="mt-4 text-[10px] text-token-text-secondary font-bold uppercase tracking-tight opacity-70">
            Eventos CRITICAL en las últimas 24 horas.
          </p>
        </Card>

        <Card
          className="p-6! cursor-pointer hover:border-sap-blue transition-all active:scale-[0.98]"
          onClick={fetchInsights}
          title="Haz clic para actualizar insights"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-sm border border-emerald-500/20">
              <CheckCircleIcon className="w-6 h-6 text-sap-success" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-token-text-tertiary uppercase tracking-widest leading-none mb-1">
                Security Tone
              </p>
              <p
                className={`text-xl font-black ${stats.criticalAlertsCount === 0 ? "text-sap-success" : "text-sap-warning"}`}
              >
                {stats.criticalAlertsCount === 0 ? "OPTIMO" : "NIVEL ALERTA"}
              </p>
            </div>
          </div>
          <p className="mt-4 text-[10px] text-token-text-secondary font-bold uppercase tracking-tight opacity-70">
            Monitor de intrusiones activo.
          </p>
        </Card>
      </div>

      <Card className="p-0! overflow-hidden" noPadding>
        <div className="p-4 border-b border-token-border-technical bg-token-surface-stripe">
          <h3 className="text-xs font-bold text-token-text-primary uppercase tracking-widest flex items-center gap-2">
            <ShieldIcon className="w-3.5 h-3.5 opacity-50" />
            Bitácora de Eventos de Seguridad Recientes
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-token-border-technical text-[9px] uppercase tracking-widest text-token-text-tertiary bg-token-surface-stripe/50 font-black">
                <th className="p-4">Timestamp</th>
                <th className="p-4">Operador</th>
                <th className="p-4">Acción</th>
                <th className="p-4">Riesgo</th>
                <th className="p-4">Origen IP</th>
                <th className="p-4">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-token-border-subtle text-[11px] font-semibold text-token-text-secondary">
              {alerts.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-12 text-center text-token-text-tertiary italic uppercase tracking-widest text-[10px]"
                  >
                    No se han detectado intrusiones o fallos en el periodo.
                  </td>
                </tr>
              ) : (
                alerts.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-token-surface-active transition-colors animate-in slide-in-from-right-2 duration-300"
                  >
                    <td className="p-4 font-mono text-[10px] font-bold">
                      {format(new Date(log.timestamp), "dd/MM | HH:mm:ss", { locale: es })}
                    </td>
                    <td className="p-4 font-bold text-token-text-primary">
                      <span className="px-2 py-0.5 bg-token-surface-stripe rounded-sm border border-token-border-subtle">
                        {log.actorUsername || "SYSTEM"}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-[10px]">{log.action}</td>
                    <td className="p-4">
                      <Badge
                        variant={
                          log.severity === "CRITICAL"
                            ? "danger"
                            : log.severity === "WARNING"
                              ? "warning"
                              : "neutral"
                        }
                        size="sm"
                        showDot
                      >
                        {log.severity}
                      </Badge>
                    </td>
                    <td className="p-4 font-mono text-[10px] opacity-60">
                      {log.ipAddress || "0.0.0.0"}
                    </td>
                    <td className="p-4">
                      <span
                        className={`font-black uppercase tracking-tighter text-[10px] px-2 py-1 rounded-sm ${
                          log.outcome === "SUCCESS"
                            ? "bg-sap-success/10 text-sap-success"
                            : "bg-sap-error/10 text-sap-error"
                        }`}
                      >
                        {log.outcome}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
