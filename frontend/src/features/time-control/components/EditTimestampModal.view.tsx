import React from "react";
import CinematicModal from "../../../components/ui/CinematicModal";
import { ClockIcon } from "../../../components/ui/icons/index";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import IconBox from "../../../components/ui/IconBox";
import { IndustrialIndicator } from "../../../components/ui/IndustrialIndicator";
import type { DailyTimeRecord, TimeRecordField } from "../../../types";

interface EditTimestampModalViewProps {
  isOpen: boolean;
  onClose: () => void;
  editingInfo: { record: DailyTimeRecord; field: TimeRecordField } | null;
  value: string;
  setValue: (value: string) => void;
  fieldLabel: string;
  handleSave: () => Promise<void>;
  isLoading: boolean;
  maxTimeForExit: string | null;
}

const EditTimestampModalView: React.FC<EditTimestampModalViewProps> = ({
  isOpen,
  onClose,
  editingInfo,
  value,
  setValue,
  fieldLabel,
  handleSave,
  isLoading,
  maxTimeForExit,
}) => {
  if (!editingInfo) return null;

  const { record, field } = editingInfo;

  return (
    <CinematicModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-4">
          <IconBox icon={<ClockIcon />} variant="primary" size="md" />
          <div>
            <h3 className="text-sm font-black text-gray-950 dark:text-white uppercase italic leading-none truncate">
              Ajustar Registro
            </h3>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1.5 italic leading-none">
              {fieldLabel} Operativo
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-md"
    >
      <div className="space-y-6">
        <div className="p-5 rounded-md bg-[#fdfbf7] dark:bg-gray-950 border border-gray-300 dark:border-gray-800 flex items-center gap-4 shadow-sm relative overflow-hidden">
          <IndustrialIndicator height="h-full" color="bg-sap-blue/20" className="mr-1" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">
              Colaborador
            </p>
            <p className="text-sm font-black text-slate-800 dark:text-white uppercase italic truncate">
              {record.employeeName}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">
              Fecha
            </p>
            <p className="text-sm font-black text-slate-800 dark:text-white uppercase italic font-mono">
              {record.date}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-black text-sap-blue uppercase tracking-[0.2em] px-1 italic">
            Seleccione Nueva Hora
          </p>
          <Input
            type="time"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-12 text-sm font-black uppercase tracking-tight rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-800"
          />
          {field === "salida" && maxTimeForExit && (
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-wide px-1">
              Máximo permitido: {maxTimeForExit} (12h desde entrada). Si la hora es menor que la
              entrada, se asume día siguiente.
            </p>
          )}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row-reverse gap-3">
          <Button
            onClick={handleSave}
            disabled={isLoading}
            variant="success"
            className="w-full sm:w-auto h-11 px-8 rounded-md font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/10"
          >
            {isLoading ? "Actualizando..." : "confirmar ajuste"}
          </Button>
          <Button
            variant="secondary"
            onClick={onClose}
            className="w-full sm:w-auto h-11 px-8 rounded-md font-black uppercase tracking-widest text-[10px] border border-gray-300 dark:border-gray-800"
          >
            cancelar
          </Button>
        </div>
      </div>
    </CinematicModal>
  );
};

export default EditTimestampModalView;
