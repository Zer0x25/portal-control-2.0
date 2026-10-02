import React from "react";
import HealthDashboard from "../../../components/layout/HealthDashboard";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import {
  UsersIcon,
  UserIcon,
  ClockIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ShieldIcon,
  ActivityIcon,
} from "../../../components/ui/icons/index";
import KpiCard, { KpiStat } from "../../../components/ui/KpiCard";
import BackupListModal from "../components/BackupListModal";

interface MaintenanceStats {
  usersCount: number;
  employeesCount: number;
  activeEmployeesCount: number;
  recordsCount: number;
  todayRecordsCount: number;
  auditLogsCount: number;
  criticalLogsCount: number;
  mfaStats: {
    enabled: number;
    disabled: number;
  };
}

interface DiagnosisResult {
  success: boolean;
  message?: string;
  summary: {
    needingAction: number;
    totalChecked: number;
  };
}

export interface SystemMaintenanceViewProps {
  stats: MaintenanceStats | null;
  diagnosis: DiagnosisResult | null;
  loading: boolean;
  isRunningBackup: boolean;
  isPurgingSessions: boolean;
  isResettingPassword: boolean;
  isResettingDatabase: boolean;
  isTriggeringAccountingAutoClose: boolean;
  purgeUsername: string;
  resetUsername: string;
  newPassword: string;
  isBackupListOpen: boolean;
  setPurgeUsername: React.Dispatch<React.SetStateAction<string>>;
  setResetUsername: React.Dispatch<React.SetStateAction<string>>;
  setNewPassword: React.Dispatch<React.SetStateAction<string>>;
  setIsBackupListOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleDiagnose: () => Promise<void>;
  handleTriggerAutoClose: () => Promise<void>;
  handleTriggerBackup: () => Promise<void>;
  handlePurgeSessions: () => Promise<void>;
  handleResetPassword: () => Promise<void>;
  handleMasterReset: () => Promise<void>;
  handleTriggerAccountingAutoClose: () => Promise<void>;
  handleRestartBackend: () => Promise<void>;
}

export const SystemMaintenanceView: React.FC<SystemMaintenanceViewProps> = ({
  stats,
  diagnosis,
  loading,
  isRunningBackup,
  isPurgingSessions,
  isResettingPassword,
  isResettingDatabase,
  isTriggeringAccountingAutoClose,
  purgeUsername,
  resetUsername,
  newPassword,
  isBackupListOpen,
  setPurgeUsername,
  setResetUsername,
  setNewPassword,
  setIsBackupListOpen,
  handleDiagnose,
  handleTriggerAutoClose,
  handleTriggerBackup,
  handlePurgeSessions,
  handleResetPassword,
  handleMasterReset,
  handleTriggerAccountingAutoClose,
  handleRestartBackend,
}) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Usuarios" icon={<UsersIcon />}>
          <KpiStat label="Total Activos" value={stats?.usersCount || 0} />
          <KpiStat
            label="MFA Habilitado"
            value={stats?.mfaStats?.enabled || 0}
            isActive={!!stats?.mfaStats?.enabled}
          />
        </KpiCard>

        <KpiCard title="Empleados" icon={<UserIcon />}>
          <KpiStat label="Nómina Total" value={stats?.employeesCount || 0} />
          <KpiStat label="En Turno" value={stats?.activeEmployeesCount || 0} />
        </KpiCard>

        <KpiCard title="Registros" icon={<ClockIcon />}>
          <KpiStat label="Total Asistencia" value={stats?.recordsCount?.toLocaleString() || 0} />
          <KpiStat label="Hoy" value={stats?.todayRecordsCount || 0} />
        </KpiCard>

        <KpiCard title="Auditoría" icon={<ShieldCheckIcon />}>
          <KpiStat label="Eventos Log" value={stats?.auditLogsCount?.toLocaleString() || 0} />
          <KpiStat
            label="Críticos (24h)"
            value={stats?.criticalLogsCount || 0}
            isActive={!!stats?.criticalLogsCount && stats.criticalLogsCount > 0}
          />
        </KpiCard>
      </div>

      <HealthDashboard />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card variant="premium" className="p-8 border-token-border-technical">
            <div className="flex items-start justify-between mb-8">
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-token-text-primary uppercase tracking-tight">
                  Mantenimiento de Registros
                </h2>
                <p className="text-token-text-tertiary max-w-lg text-[12px] font-semibold leading-relaxed">
                  Gatilla cierres automáticos masivos y diagnósticos de salud de asistencia para
                  garantizar la coherencia de reportes.
                </p>
              </div>
              <div className="p-3 bg-[var(--sidebar-text-active)]/10 rounded-sm">
                <ActivityIcon className="w-8 h-8 text-[var(--sidebar-text-active)]" />
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <Button
                onClick={handleDiagnose}
                loading={loading}
                className="h-11 px-8 bg-[var(--sidebar-text-active)] text-white font-bold uppercase text-[10px] tracking-widest rounded-sm shadow-lg shadow-[var(--sidebar-text-active)]/20"
              >
                <ArrowPathIcon className="w-4 h-4 mr-3" />
                Iniciar Diagnóstico
              </Button>

              <Button
                variant="danger"
                onClick={handleTriggerAutoClose}
                loading={loading}
                disabled={!diagnosis || diagnosis?.summary?.needingAction === 0}
                className="h-11 px-8 font-bold uppercase text-[10px] tracking-widest rounded-sm disabled:opacity-30"
              >
                <ExclamationTriangleIcon className="w-4 h-4 mr-3" />
                Gatillar Cierre Masivo
              </Button>
            </div>

            {diagnosis && (
              <div
                className={`mt-6 p-6 rounded-sm border ${diagnosis.summary.needingAction > 0 ? "bg-[var(--status-warning)]/5 border-[var(--status-warning)]/20 text-[var(--status-warning)]" : "bg-[var(--status-success)]/5 border-[var(--status-success)]/20 text-[var(--status-success)]"}`}
              >
                <div className="flex items-center gap-4">
                  <ActivityIcon className="w-6 h-6 opacity-40" />
                  <div>
                    <p className="font-bold text-xs uppercase tracking-tight">
                      {diagnosis.summary.needingAction > 0
                        ? "Atención Requerida"
                        : "Sincronización Óptima"}
                    </p>
                    <p className="text-[10px] font-semibold opacity-70 uppercase tracking-widest">
                      {diagnosis.summary.needingAction > 0
                        ? `${diagnosis.summary.needingAction} REGISTROS HUÉRFANOS DETECTADOS`
                        : "NO SE ENCONTRARON REGISTROS PENDIENTES"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6 border-b border-token-border-technical pb-4">
                <ShieldIcon className="w-5 h-5 text-indigo-500" />
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-token-text-primary">
                  Gestión de Identidad
                </h3>
              </div>
              <div className="space-y-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleResetPassword();
                  }}
                  autoComplete="off"
                  className="space-y-3 p-4 bg-token-surface-stripe border border-token-border-subtle rounded-sm"
                >
                  <label className="block text-[9px] uppercase tracking-widest text-token-text-tertiary font-bold">
                    Reset Password Manual
                  </label>
                  <input
                    type="text"
                    name="reset-username"
                    autoComplete="off"
                    value={resetUsername}
                    onChange={(e) => setResetUsername(e.target.value)}
                    placeholder="USERNAME"
                    className="w-full h-9 px-3 rounded-sm bg-token-surface-card border border-token-border-technical text-token-text-primary text-[10px] font-bold uppercase outline-none focus:ring-1 focus:ring-[var(--sidebar-text-active)]/30"
                  />
                  <input
                    type="password"
                    name="new-password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="NUEVA PASSWORD"
                    className="w-full h-9 px-3 rounded-sm bg-token-surface-card border border-token-border-technical text-token-text-primary text-[10px] font-bold uppercase outline-none focus:ring-1 focus:ring-[var(--sidebar-text-active)]/30"
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    loading={isResettingPassword}
                    className="w-full h-9 rounded-sm text-[9px] font-bold uppercase tracking-widest border border-token-border-technical"
                  >
                    Actualizar Credencial
                  </Button>
                </form>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6 border-b border-token-border-technical pb-4">
                <ActivityIcon className="w-5 h-5 text-sap-warning" />
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-token-text-primary">
                  Control de Sesiones
                </h3>
              </div>
              <div className="space-y-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handlePurgeSessions();
                  }}
                  autoComplete="off"
                  className="space-y-3 p-4 bg-token-surface-stripe border border-token-border-subtle rounded-sm"
                >
                  <label className="block text-[9px] uppercase tracking-widest text-token-text-tertiary font-bold">
                    Purgar Sesiones Activas
                  </label>
                  <input
                    type="text"
                    name="purge-username"
                    autoComplete="off"
                    value={purgeUsername}
                    onChange={(e) => setPurgeUsername(e.target.value)}
                    placeholder="USERNAME (VACÍO = GLOBAL)"
                    className="w-full h-9 px-3 rounded-sm bg-token-surface-card border border-token-border-technical text-token-text-primary text-[10px] font-bold uppercase outline-none focus:ring-1 focus:ring-[var(--sidebar-text-active)]/30"
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    loading={isPurgingSessions}
                    className="w-full h-9 rounded-sm text-[9px] font-bold uppercase tracking-widest border border-token-border-technical"
                  >
                    Ejecutar Purga
                  </Button>
                </form>
              </div>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card
            variant="premium"
            className="bg-token-surface-stripe border border-token-border-technical p-8 relative overflow-hidden group shadow-sm"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-700 pointer-events-none">
              <ShieldIcon className="w-32 h-32 text-[var(--status-error)]" />
            </div>
            <div className="relative z-10 space-y-6">
              <h3 className="text-sm font-bold text-token-text-primary uppercase tracking-widest border-b border-token-border-technical pb-4">
                Protocolos Críticos
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-token-surface-card border border-token-border-technical rounded-sm space-y-3">
                  <p className="text-[10px] font-bold text-token-text-tertiary uppercase tracking-widest">
                    Resguardo de Datos
                  </p>
                  <Button
                    variant="secondary"
                    onClick={handleTriggerBackup}
                    loading={isRunningBackup}
                    className="w-full h-11 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-token-surface-card border border-token-border-technical shadow-sm"
                  >
                    Capturar Snapshot Manual
                  </Button>
                  <p className="text-[9px] text-token-text-tertiary italic">
                    Genera un respaldo completo de la base de datos PostgreSQL.
                  </p>
                </div>

                <div className="p-4 bg-token-surface-card border border-token-border-technical rounded-sm space-y-3">
                  <p className="text-[10px] font-bold text-token-text-tertiary uppercase tracking-widest">
                    Restauración de Sistema
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => setIsBackupListOpen(true)}
                    className="w-full h-11 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-token-surface-card border border-token-border-technical shadow-sm"
                  >
                    <ArrowPathIcon className="w-4 h-4 mr-2" />
                    Restaurar Desde Backup
                  </Button>
                  <p className="text-[9px] text-token-text-tertiary italic">
                    Recupera el sistema a un punto anterior. (Requiere reinicio)
                  </p>
                </div>

                <div className="p-4 bg-token-surface-card border border-token-border-technical rounded-sm space-y-3">
                  <p className="text-[10px] font-bold text-token-text-tertiary uppercase tracking-widest">
                    Cierre Contable
                  </p>
                  <Button
                    variant="secondary"
                    onClick={handleTriggerAccountingAutoClose}
                    loading={isTriggeringAccountingAutoClose}
                    className="w-full h-11 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-token-surface-card border border-token-border-technical shadow-sm"
                  >
                    Disparar Cierre Contable Auto
                  </Button>
                  <p className="text-[9px] text-token-text-tertiary italic">
                    Fuerza la regla de cierre automático contable al mes objetivo.
                  </p>
                </div>

                <div className="p-4 bg-token-surface-card border border-token-border-technical rounded-sm space-y-3">
                  <p className="text-[10px] font-bold text-token-text-tertiary uppercase tracking-widest">
                    Operaciones de Servidor
                  </p>
                  <Button
                    variant="secondary"
                    onClick={handleRestartBackend}
                    className="w-full h-11 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-token-surface-card border border-token-border-technical shadow-sm"
                  >
                    <ArrowPathIcon className="w-4 h-4 mr-2" />
                    Reiniciar Backend
                  </Button>
                  <p className="text-[9px] text-token-text-tertiary italic">
                    Fuerza un reinicio del proceso del servidor backend.
                  </p>
                </div>

                <div className="p-4 bg-sap-error/5 border border-sap-error/20 rounded-sm space-y-3">
                  <p className="text-[10px] font-bold text-sap-error uppercase tracking-widest">
                    Protocolo Destructivo
                  </p>
                  <Button
                    variant="danger"
                    onClick={handleMasterReset}
                    loading={isResettingDatabase}
                    className="w-full h-11 rounded-sm text-[10px] font-bold uppercase tracking-widest"
                  >
                    Reseteo Maestro (Clear DB)
                  </Button>
                  <p className="text-[9px] text-sap-error/70 font-bold uppercase">
                    ¡ADVERTENCIA! Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <BackupListModal isOpen={isBackupListOpen} onClose={() => setIsBackupListOpen(false)} />
    </div>
  );
};
