import React from "react";
import CinematicModal from "./CinematicModal";
import Button from "./Button";
import { EnrichedTimeRecord } from "../../types";
import {
  ExclamationTriangleIcon,
  EditIcon,
  UserMinusIcon,
  CheckBadgeIcon,
  ClipboardCheckIcon,
  MinusCircleIcon,
  CalendarDaysIcon,
} from "./icons/index";
import IconBox from "./IconBox";

interface AnomalyResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: EnrichedTimeRecord | null;
  onEdit: (record: EnrichedTimeRecord) => void;
  onResolve: (
    id: string,
    resolution:
      "ABSENCE_MARK" | "SHIFT_HOURS_ACK" | "PERMIT_MARK" | "DAY_OFF_MARK" | "VACATION_MARK",
  ) => Promise<void>;
  isProcessing: boolean;
}

const AnomalyResolutionModal: React.FC<AnomalyResolutionModalProps> = ({
  isOpen,
  onClose,
  record,
  onEdit,
  onResolve,
  isProcessing,
}) => {
  if (!record) return null;

  const isAutoClose =
    record.justification?.reason === "AUTO_CLOSE_EXCEEDED_14H" ||
    record.justification?.reason === "AUTO_CLOSE_END_OF_DAY";
  return (
    <CinematicModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <IconBox icon={<ExclamationTriangleIcon />} variant="warning" size="md" />
          <span className="text-token-text-primary">Resolución de Anomalía</span>
        </div>
      }
      maxWidth="max-w-xl"
    >
      <div className="space-y-6">
        <div className="bg-token-surface-stripe p-4 rounded-md border border-token-border-subtle">
          <p className="text-[10px] font-black uppercase tracking-widest text-token-text-tertiary mb-2">
            Detalle del Registro
          </p>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-token-text-primary">{record.employeeName}</span>
            <span className="text-xs text-token-text-secondary font-mono">
              Fecha: {record.date} | Estado: {record.status}
            </span>
            {record.justification?.comment && (
              <div className="mt-3 p-2 bg-amber-500/10 border-l-2 border-amber-500 text-amber-600 dark:text-amber-400 text-xs font-medium italic">
                "{record.justification.comment}"
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-token-text-tertiary">
            Seleccione una acción para reparar
          </p>

          <Button
            variant="none"
            onClick={() => {
              onEdit(record);
              onClose();
            }}
            className="w-full flex items-center gap-4 p-4 rounded-md border border-token-border-subtle hover:border-token-accent-brand hover:bg-token-accent-brand/5 transition-all group text-left shadow-none"
          >
            <div className="p-2 bg-token-surface-technical rounded-md group-hover:bg-token-accent-brand group-hover:text-white transition-colors">
              <EditIcon className="w-5 h-5 text-token-text-secondary group-hover:text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-token-text-primary">
                Editar Registro Manualmente
              </p>
              <p className="text-xs text-token-text-secondary">
                Corrige los marcajes de entrada o salida.
              </p>
            </div>
          </Button>

          <Button
            variant="none"
            onClick={() => onResolve(record.id, "ABSENCE_MARK")}
            disabled={isProcessing}
            className="w-full flex items-center gap-4 p-4 rounded-md border border-token-border-subtle hover:border-token-status-error hover:bg-token-status-error/5 transition-all group text-left disabled:opacity-50 shadow-none"
          >
            <div className="p-2 bg-token-surface-technical rounded-md group-hover:bg-token-status-error group-hover:text-white transition-colors">
              <UserMinusIcon className="w-5 h-5 text-token-text-secondary group-hover:text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-token-text-primary">Marcar como Ausente</p>
              <p className="text-xs text-token-text-secondary">
                Transforma este registro en una inasistencia formal.
              </p>
            </div>
          </Button>

          <Button
            variant="none"
            onClick={() => onResolve(record.id, "PERMIT_MARK")}
            disabled={isProcessing}
            className="w-full flex items-center gap-4 p-4 rounded-md border border-token-border-subtle hover:border-token-status-warning hover:bg-token-status-warning/5 transition-all group text-left disabled:opacity-50 shadow-none"
          >
            <div className="p-2 bg-token-surface-technical rounded-md group-hover:bg-token-status-warning group-hover:text-white transition-colors">
              <ClipboardCheckIcon className="w-5 h-5 text-token-text-secondary group-hover:text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-token-text-primary">
                Marcar como Permiso Especial
              </p>
              <p className="text-xs text-token-text-secondary">
                Resuelve la anomalía como permiso administrativo autorizado.
              </p>
            </div>
          </Button>

          <Button
            variant="none"
            onClick={() => onResolve(record.id, "VACATION_MARK")}
            disabled={isProcessing}
            className="w-full flex items-center gap-4 p-4 rounded-md border border-token-border-subtle hover:border-token-status-info hover:bg-token-status-info/5 transition-all group text-left disabled:opacity-50 shadow-none"
          >
            <div className="p-2 bg-token-surface-technical rounded-md group-hover:bg-token-status-info group-hover:text-white transition-colors">
              <CalendarDaysIcon className="w-5 h-5 text-token-text-secondary group-hover:text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-token-text-primary">Marcar como Vacaciones</p>
              <p className="text-xs text-token-text-secondary">
                Resuelve la anomalía dejando el día registrado como vacaciones.
              </p>
            </div>
          </Button>

          <Button
            variant="none"
            onClick={() => onResolve(record.id, "DAY_OFF_MARK")}
            disabled={isProcessing}
            className="w-full flex items-center gap-4 p-4 rounded-md border border-token-border-subtle hover:border-token-text-tertiary hover:bg-token-surface-hover transition-all group text-left disabled:opacity-50 shadow-none"
          >
            <div className="p-2 bg-token-surface-technical rounded-md group-hover:bg-token-surface-hover group-hover:text-white transition-colors">
              <MinusCircleIcon className="w-5 h-5 text-token-text-secondary group-hover:text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-token-text-primary">Marcar como Día Libre</p>
              <p className="text-xs text-token-text-secondary">
                Registra el día como descanso/no laborable por decisión supervisora.
              </p>
            </div>
          </Button>

          {isAutoClose && (
            <Button
              variant="none"
              onClick={() => onResolve(record.id, "SHIFT_HOURS_ACK")}
              disabled={isProcessing}
              className="w-full flex items-center gap-4 p-4 rounded-md border border-token-border-subtle hover:border-token-status-success hover:bg-token-status-success/5 transition-all group text-left disabled:opacity-50 shadow-none"
            >
              <div className="p-2 bg-token-surface-technical rounded-md group-hover:bg-token-status-success group-hover:text-white transition-colors">
                <CheckBadgeIcon className="w-5 h-5 text-token-text-secondary group-hover:text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-token-text-primary">
                  Omitir Salida (Validar Horas Turno)
                </p>
                <p className="text-xs text-token-text-secondary">
                  Acepta la falta de marcaje y cuadra con el horario programado.
                </p>
              </div>
            </Button>
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button onClick={onClose} variant="secondary">
          Cerrar
        </Button>
      </div>
    </CinematicModal>
  );
};

export default AnomalyResolutionModal;
