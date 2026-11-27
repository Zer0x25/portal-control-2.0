import React from "react";
import CinematicModal from "../../../components/ui/CinematicModal";
import EmptyState from "../../../components/ui/EmptyState";
import IconBox from "../../../components/ui/IconBox";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import DashboardRow from "./ui/DashboardRow";
import { ExclamationTriangleIcon, ShieldIcon } from "../../../components/ui/icons/index";
import { TIME_RECORD_STATUS_CONFIG } from "../../../utils/mappings";
import type { TeamAnomalyRecord } from "../../../types";
import type { TimeRecordStatus } from "../../../types/time";

/** Clasificación de la anomalía a partir del registro que la origina. */
const describeAnomaly = (anomaly: TeamAnomalyRecord) => {
  if (anomaly.id.startsWith("MISSING-")) {
    return {
      label: "Falta Marcaje",
      detail: `Turno asignado del ${anomaly.date} sin marcaje registrado.`,
      config: TIME_RECORD_STATUS_CONFIG.SinMarcajeTurnoAsignado,
    };
  }
  if (anomaly.status === "Laborando" || anomaly.status === "Colacion") {
    return {
      label: "Jornada Excedida",
      detail: "Turno abierto por más de 14 horas sin justificación.",
      config: TIME_RECORD_STATUS_CONFIG[(anomaly.status as TimeRecordStatus) ?? "Laborando"],
    };
  }
  const config =
    TIME_RECORD_STATUS_CONFIG[(anomaly.status as TimeRecordStatus) ?? "AnomaliaManual"] ??
    TIME_RECORD_STATUS_CONFIG.AnomaliaManual;
  return {
    label: config.label,
    detail: `Registro del ${anomaly.date} cerrado con anomalía.`,
    config,
  };
};

interface AnomaliesModalProps {
  isOpen: boolean;
  onClose: () => void;
  anomalies: TeamAnomalyRecord[];
  count: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onAnomalyDoubleClick: (record: TeamAnomalyRecord) => void;
}

/**
 * Modal "Anomalías del Equipo": detalle bajo demanda de las anomalías que
 * alimentan el conteo del Panel de Operación (mismo criterio que el backend).
 * Presentacional puro; los datos los resuelve el container (spec 036).
 */
const AnomaliesModal: React.FC<AnomaliesModalProps> = ({
  isOpen,
  onClose,
  anomalies,
  count,
  isLoading,
  isError,
  onRetry,
  onAnomalyDoubleClick,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <CinematicModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-4">
          <IconBox icon={<ShieldIcon />} variant="warning" size="md" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-black text-token-text-primary uppercase italic leading-none">
              Anomalías del Equipo
            </h3>
            <p className="text-xxs font-black text-token-text-tertiary uppercase tracking-[0.2em] mt-1.5 italic leading-none">
              {`${count} registro(s) por resolver`}
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-12 text-center">
            <div className="inline-block mb-4">
              <LoadingSpinner size="md" variant="default" />
            </div>
            <p className="text-[10px] font-black text-token-text-tertiary uppercase tracking-[0.3em] animate-pulse">
              Sincronizando anomalías...
            </p>
          </div>
        ) : isError ? (
          <EmptyState
            icon={<ExclamationTriangleIcon />}
            title="Error de Carga"
            description="No se pudo obtener el detalle de anomalías."
            actionLabel="Reintentar"
            onAction={onRetry}
          />
        ) : anomalies.length > 0 ? (
          <div
            // Región scrollable accesible por teclado (WCAG 2.1): patrón
            // sancionado, no es un elemento interactivo.
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={0}
            role="region"
            aria-label="Anomalías del equipo"
            className="space-y-2 max-h-[55vh] overflow-y-auto pr-1 px-1 custom-scrollbar focus:outline-hidden"
          >
            {anomalies.map((anomaly, index) => {
              const { label, detail, config } = describeAnomaly(anomaly);
              return (
                <DashboardRow
                  key={anomaly.id}
                  initial={anomaly.employeeName.charAt(0)}
                  title={anomaly.employeeName}
                  subtitle={detail}
                  indicator={
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border border-black/5 dark:border-white/10 ${config.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full bg-current ${config.text}`} />
                      <span
                        className={`text-xxs font-bold uppercase tracking-widest leading-none ${config.text}`}
                      >
                        {label}
                      </span>
                    </div>
                  }
                  onDoubleClick={() => onAnomalyDoubleClick(anomaly)}
                  animationDelay={index * 0.04}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<ExclamationTriangleIcon />}
            title="Sin Anomalías"
            description="No hay registros anómalos ni marcas pendientes por resolver."
          />
        )}

        <p className="text-center text-[10px] font-black text-token-text-tertiary/60 uppercase tracking-widest italic pt-1">
          Doble clic sobre un registro para gestionarlo
        </p>
      </div>
    </CinematicModal>
  );
};

export default AnomaliesModal;
