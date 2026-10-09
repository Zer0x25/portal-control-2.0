import React from "react";
import { DailyTimeRecord, TimeRecordField, ClockingStatus } from "../../../types";
import Button from "../../../components/ui/Button";
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ClockIcon,
  EditIcon,
  WrenchScrewdriverIcon,
} from "../../../components/ui/icons/index";
import CinematicModal from "../../../components/ui/CinematicModal";
import IconBox from "../../../components/ui/IconBox";
import { IndustrialIndicator } from "../../../components/ui/IndustrialIndicator";

interface QuickActionModalViewProps {
  isOpen: boolean;
  onClose: () => void;
  record: DailyTimeRecord | null;
  clockStatus: ClockingStatus;
  onStartBreak: () => void;
  onEndBreak: () => void;
  onClockOut: () => void;
  onEdit: (record: DailyTimeRecord, field: TimeRecordField) => void;
  onResolveAnomaly?: (record: DailyTimeRecord) => void;
  activeTab: "live" | "edit";
  setActiveTab: React.Dispatch<React.SetStateAction<"live" | "edit">>;
  allowEdit: boolean | null;
  isControlInternoEnabled: boolean;
  isArmed: boolean;
  isLocked: boolean;
  isJustified: boolean;
  isShiftOpen: boolean;
  finalDisabledState: boolean;
  finalTooltip: string;
  canStartBreak: boolean;
  canEndBreak: boolean;
  canClockOut: boolean;
  statusConfig: {
    label: string;
    bg: string;
    text: string;
  };
}

const QuickActionModalView: React.FC<QuickActionModalViewProps> = ({
  isOpen,
  onClose,
  record,
  clockStatus: _clockStatus,
  onStartBreak,
  onEndBreak,
  onClockOut,
  onEdit,
  onResolveAnomaly,
  activeTab,
  setActiveTab,
  allowEdit,
  isControlInternoEnabled,
  isArmed,
  isLocked,
  isJustified,
  isShiftOpen,
  finalDisabledState,
  finalTooltip,
  canStartBreak,
  canEndBreak,
  canClockOut,
  statusConfig,
}) => {
  if (!isOpen || !record) return null;

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  const renderEditButtons = () => (
    <div className="space-y-4">
      {!isShiftOpen && (
        <h4 className="text-[10px] font-black text-center text-token-text-secondary uppercase tracking-widest mb-2">
          Control de Marcajes
        </h4>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="none"
          onClick={() => onEdit(record, "entrada")}
          disabled={finalDisabledState}
          title={finalTooltip}
          className={`flex items-center justify-center gap-3 h-14 shadow-md transition-all group hover:scale-[1.02] active:scale-[0.98] ${
            finalDisabledState
              ? "bg-sky-500/10 text-sky-700/40 dark:text-sky-400/30 border border-sky-500/20 shadow-none"
              : "bg-sky-600 text-white border border-sky-500 shadow-md hover:bg-sky-700"
          }`}
        >
          <ClockIcon className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
          <span className="text-[10px] font-black uppercase tracking-widest">Editar Inicio</span>
        </Button>

        <Button
          variant="none"
          onClick={() => onEdit(record, "inicioColacion")}
          disabled={finalDisabledState}
          title={finalTooltip}
          className={`flex items-center justify-center gap-3 h-14 shadow-md transition-all group hover:scale-[1.02] active:scale-[0.98] ${
            finalDisabledState
              ? "bg-amber-500/10 text-amber-700/40 dark:text-amber-400/30 border border-amber-500/20 shadow-none"
              : "bg-amber-600 text-white border border-amber-500 shadow-md hover:bg-amber-700"
          }`}
        >
          <EditIcon className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
          <span className="text-[10px] font-black uppercase tracking-widest text-center">
            Ini. Col.
          </span>
        </Button>

        <Button
          variant="none"
          onClick={() => onEdit(record, "finColacion")}
          disabled={finalDisabledState}
          title={finalTooltip}
          className={`flex items-center justify-center gap-3 h-14 shadow-md transition-all group hover:scale-[1.02] active:scale-[0.98] ${
            finalDisabledState
              ? "bg-indigo-500/10 text-indigo-700/40 dark:text-indigo-400/30 border border-indigo-500/20 shadow-none"
              : "bg-indigo-600 text-white border border-indigo-500 shadow-md hover:bg-indigo-700"
          }`}
        >
          <EditIcon className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
          <span className="text-[10px] font-black uppercase tracking-widest text-center">
            Fin Col.
          </span>
        </Button>

        <Button
          variant="none"
          onClick={() => onEdit(record, "salida")}
          disabled={finalDisabledState}
          title={finalTooltip}
          className={`flex items-center justify-center gap-3 h-14 shadow-md transition-all group hover:scale-[1.02] active:scale-[0.98] ${
            finalDisabledState
              ? "bg-rose-500/10 text-rose-700/40 dark:text-rose-400/30 border border-rose-500/20 shadow-none"
              : "bg-rose-600 text-white border border-rose-500 shadow-md hover:bg-rose-700"
          }`}
        >
          <ArrowPathIcon className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
          <span className="text-[10px] font-black uppercase tracking-widest text-center">
            Fin Jornada
          </span>
        </Button>
      </div>

      {(record.status === "AnomaliaManual" || record.status === "SinMarcajeTurnoAsignado") &&
        onResolveAnomaly && (
          <div className="mt-4 pt-4 border-t border-token-border-subtle">
            <Button
              variant="none"
              onClick={() => onResolveAnomaly(record)}
              disabled={!isArmed || isLocked}
              title={isLocked ? "Bloqueado por cierre" : ""}
              className={`w-full flex items-center justify-center gap-3 h-14 shadow-md transition-all group hover:scale-[1.02] active:scale-[0.98] ${
                !isArmed || isLocked
                  ? "bg-amber-500/10 text-amber-700/40 dark:text-amber-400/30 border border-amber-500/20 shadow-none"
                  : "bg-sap-blue text-white border border-sap-blue shadow-md hover:bg-sap-blue-dark"
              }`}
            >
              <WrenchScrewdriverIcon className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Resolver Anomalía
              </span>
            </Button>
          </div>
        )}
    </div>
  );

  const renderLiveActionButtons = () => (
    <div className="grid grid-cols-2 gap-3">
      <Button
        variant="none"
        onClick={() => handleAction(onStartBreak)}
        disabled={finalDisabledState || !canStartBreak}
        title={!canStartBreak ? "No disponible" : finalTooltip}
        className={`text-[10px] font-black uppercase tracking-widest h-14 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] ${
          finalDisabledState || !canStartBreak
            ? "bg-amber-500/10 text-amber-700/40 dark:text-amber-400/30 border border-amber-500/20 shadow-none"
            : "bg-amber-600 text-white border border-amber-500 shadow-md hover:bg-amber-700"
        }`}
      >
        Inicio Colación
      </Button>
      <Button
        variant="none"
        onClick={() => handleAction(onEndBreak)}
        disabled={finalDisabledState || !canEndBreak}
        title={!canEndBreak ? "No disponible" : finalTooltip}
        className={`text-[10px] font-black uppercase tracking-widest h-14 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] ${
          finalDisabledState || !canEndBreak
            ? "bg-sky-500/10 text-sky-700/40 dark:text-sky-400/30 border border-sky-500/20 shadow-none"
            : "bg-sky-600 text-white border border-sky-500 shadow-md hover:bg-sky-700"
        }`}
      >
        Fin Colación
      </Button>
      <Button
        variant="none"
        onClick={() => handleAction(onClockOut)}
        disabled={finalDisabledState || !canClockOut}
        title={!canClockOut ? "No disponible" : finalTooltip}
        className={`col-span-2 text-[10px] font-black uppercase tracking-widest h-14 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] ${
          finalDisabledState || !canClockOut
            ? "bg-rose-500/10 text-rose-700/40 dark:text-rose-400/30 border border-rose-500/20 shadow-none"
            : "bg-rose-600 text-white border border-rose-500 shadow-md hover:bg-rose-700"
        }`}
      >
        Finalizar Jornada Laboral
      </Button>
    </div>
  );

  return (
    <CinematicModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-4">
          <IconBox icon={<ArrowPathIcon />} variant="primary" size="md" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-black text-token-text-primary uppercase italic leading-none truncate">
              {record.employeeName}
            </h3>
            <p className="text-[9px] font-black text-token-text-tertiary uppercase tracking-[0.2em] mt-1.5 italic leading-none">
              Gestión Rápida de Jornada
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-md"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 rounded-md bg-token-surface-stripe border border-token-border-technical relative overflow-hidden shadow-sm">
          <IndustrialIndicator
            height="h-full"
            color={statusConfig.bg.replace("bg-", "bg-").split(" ")[0]}
            className="mr-3"
          />
          <span className="flex-1 text-[10px] font-black text-token-text-secondary uppercase tracking-widest">
            Estado de Jornada
          </span>
          <span
            className={`px-4 py-1.5 text-[10px] font-black rounded uppercase tracking-widest ${statusConfig.bg} ${statusConfig.text} shadow-sm border border-token-border-technical`}
          >
            {statusConfig.label}
          </span>
        </div>

        {isLocked && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400 italic">
              Registro bloqueado por cierre contable. No se permiten modificaciones.
            </p>
          </div>
        )}

        {isJustified && (
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex gap-3">
            <InformationCircleIcon className="w-5 h-5 text-indigo-500 shrink-0" />
            <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 italic">
              Este registro ya fue justificado y se encuentra protegido.
            </p>
          </div>
        )}

        {isShiftOpen && !isJustified && !isLocked && (
          <div className="space-y-6">
            <div className="flex p-1 bg-token-surface-stripe rounded-2xl border border-token-border-technical">
              {isControlInternoEnabled && (
                <Button
                  variant="none"
                  onClick={() => setActiveTab("live")}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                    activeTab === "live"
                      ? "bg-token-surface-card text-sap-blue shadow-sm"
                      : "text-token-text-secondary hover:text-token-text-primary"
                  }`}
                >
                  Acciones en Vivo
                </Button>
              )}
              {allowEdit && (
                <Button
                  variant="none"
                  onClick={() => setActiveTab("edit")}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                    activeTab === "edit"
                      ? "bg-token-surface-card text-sap-blue shadow-sm"
                      : "text-token-text-secondary hover:text-token-text-primary"
                  }`}
                >
                  Edición Manual
                </Button>
              )}
            </div>

            <div className="pt-2">
              {isControlInternoEnabled && activeTab === "live" && renderLiveActionButtons()}
              {allowEdit && activeTab === "edit" && renderEditButtons()}
            </div>
          </div>
        )}

        {!isShiftOpen && !isJustified && !isLocked && (
          <div className="space-y-4">
            {allowEdit ? (
              renderEditButtons()
            ) : (
              <div className="py-10 text-center opacity-40">
                <p className="text-[10px] font-black text-token-text-tertiary uppercase tracking-widest italic">
                  Edición restringida a nivel Administrativo
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-2 pt-4 opacity-30">
          <div
            className={`w-1.5 h-1.5 rounded-full ${isArmed ? "bg-emerald-500" : "bg-token-text-tertiary animate-pulse"}`}
          />
          <span className="text-[9px] font-black text-token-text-secondary uppercase tracking-[0.2em] italic">
            {!isArmed ? "Inicializando Vínculo..." : "Conexión Segura"}
          </span>
        </div>
      </div>
    </CinematicModal>
  );
};

export default QuickActionModalView;
