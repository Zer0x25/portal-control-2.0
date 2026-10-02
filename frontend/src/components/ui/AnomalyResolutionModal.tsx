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
      | "ABSENCE_MARK"
      | "SHIFT_HOURS_ACK"
      | "PERMIT_MARK"
      | "DAY_OFF_MARK"
      | "VACATION_MARK",
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
          <span className="text-slate-900 dark:text-white">Resolución de Anomalía</span>
        </div>
      }
      maxWidth="max-w-xl"
    >
      <div className="space-y-6">
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-sm border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
            Detalle del Registro
          </p>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {record.employeeName}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Fecha: {record.date} | Estado: {record.status}
            </span>
            {record.justification?.comment && (
              <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border-l-2 border-yellow-400 text-yellow-800 dark:text-yellow-200 text-xs font-medium italic">
                "{record.justification.comment}"
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Seleccione una acción para reparar
          </p>

          <button
            onClick={() => {
              onEdit(record);
              onClose();
            }}
            className="w-full flex items-center gap-4 p-4 rounded-sm border border-slate-200 dark:border-slate-800 hover:border-sap-blue hover:bg-sap-blue/5 transition-all group text-left"
          >
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-sm group-hover:bg-sap-blue group-hover:text-white transition-colors">
              <EditIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Editar Registro Manualmente
              </p>
              <p className="text-xs text-slate-500">Corrige los marcajes de entrada o salida.</p>
            </div>
          </button>

          <button
            onClick={() => onResolve(record.id, "ABSENCE_MARK")}
            disabled={isProcessing}
            className="w-full flex items-center gap-4 p-4 rounded-sm border border-slate-200 dark:border-slate-800 hover:border-red-500 hover:bg-red-500/5 transition-all group text-left disabled:opacity-50"
          >
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-sm group-hover:bg-red-500 group-hover:text-white transition-colors">
              <UserMinusIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Marcar como Ausente
              </p>
              <p className="text-xs text-slate-500">
                Transforma este registro en una inasistencia formal.
              </p>
            </div>
          </button>

          <button
            onClick={() => onResolve(record.id, "PERMIT_MARK")}
            disabled={isProcessing}
            className="w-full flex items-center gap-4 p-4 rounded-sm border border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:bg-amber-500/5 transition-all group text-left disabled:opacity-50"
          >
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-sm group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <ClipboardCheckIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Marcar como Permiso Especial
              </p>
              <p className="text-xs text-slate-500">
                Resuelve la anomalía como permiso administrativo autorizado.
              </p>
            </div>
          </button>

          <button
            onClick={() => onResolve(record.id, "VACATION_MARK")}
            disabled={isProcessing}
            className="w-full flex items-center gap-4 p-4 rounded-sm border border-slate-200 dark:border-slate-800 hover:border-cyan-500 hover:bg-cyan-500/5 transition-all group text-left disabled:opacity-50"
          >
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-sm group-hover:bg-cyan-500 group-hover:text-white transition-colors">
              <CalendarDaysIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Marcar como Vacaciones
              </p>
              <p className="text-xs text-slate-500">
                Resuelve la anomalía dejando el día registrado como vacaciones.
              </p>
            </div>
          </button>

          <button
            onClick={() => onResolve(record.id, "DAY_OFF_MARK")}
            disabled={isProcessing}
            className="w-full flex items-center gap-4 p-4 rounded-sm border border-slate-200 dark:border-slate-800 hover:border-slate-500 hover:bg-slate-500/5 transition-all group text-left disabled:opacity-50"
          >
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-sm group-hover:bg-slate-600 group-hover:text-white transition-colors">
              <MinusCircleIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Marcar como Día Libre
              </p>
              <p className="text-xs text-slate-500">
                Registra el día como descanso/no laborable por decisión supervisora.
              </p>
            </div>
          </button>

          {isAutoClose && (
            <button
              onClick={() => onResolve(record.id, "SHIFT_HOURS_ACK")}
              disabled={isProcessing}
              className="w-full flex items-center gap-4 p-4 rounded-sm border border-slate-200 dark:border-slate-800 hover:border-green-500 hover:bg-green-500/5 transition-all group text-left disabled:opacity-50"
            >
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-sm group-hover:bg-green-500 group-hover:text-white transition-colors">
                <CheckBadgeIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Omitir Salida (Validar Horas Turno)
                </p>
                <p className="text-xs text-slate-500">
                  Acepta la falta de marcaje y cuadra con el horario programado.
                </p>
              </div>
            </button>
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
