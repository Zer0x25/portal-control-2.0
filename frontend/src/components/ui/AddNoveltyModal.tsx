import React, { useState, useEffect } from "react";
import Button from "./Button";
import { BookOpenIcon, ClockIcon } from "./icons/index";
import { formatTime } from "../../utils/formatters";
import TimePickerDialog from "./TimePickerDialog";
import CinematicModal from "./CinematicModal";

interface AddNoveltyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (annotation: string, time: string) => Promise<void>;
  initialText?: string;
  initialTime?: string;
  isEditing: boolean;
}

const AddNoveltyModal: React.FC<AddNoveltyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialText = "",
  initialTime,
  isEditing,
}) => {
  const [annotation, setAnnotation] = useState("");
  const [time, setTime] = useState("");
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAnnotation(initialText);
      setTime(initialTime || formatTime(new Date()));
    }
  }, [isOpen, initialText, initialTime]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annotation.trim() || !time.trim()) {
      return;
    }
    onSave(annotation, time);
  };

  const handleClockClick = () => {
    setIsTimePickerOpen(true);
  };

  return (
    <CinematicModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-4">
          <div className="bg-sap-blue/10 dark:bg-sap-blue/20 p-2.5 rounded-xl">
            <BookOpenIcon className="w-5 h-5 text-sap-blue dark:text-sap-light-blue" />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-950 dark:text-white tracking-tight uppercase">
              {isEditing ? "Editar Novedad" : "Ingreso de Novedad"}
            </h3>
            <p className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mt-0.5">
              Libro de Novedades Digital
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4 italic">
            Hora del Evento
          </label>
          <div className="relative group cursor-pointer" onClick={handleClockClick}>
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-sap-blue z-10 pointer-events-none">
              <ClockIcon className="w-6 h-6 animate-pulse" />
            </div>
            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-950/40 border border-black/15 dark:border-white/5 p-1 transition-all group-hover:border-sap-blue/30 shadow-inner">
              <div className="w-full h-20 pl-16 pr-8 bg-transparent text-4xl font-mono font-black text-gray-950 dark:text-sap-light-blue outline-none relative z-10 flex items-center select-none pointer-events-none">
                {time}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4 italic">
            Detalle de la anotación
          </label>
          <textarea
            value={annotation}
            onChange={(e) => setAnnotation(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (annotation.trim() && time.trim()) {
                  onSave(annotation, time);
                }
              }
            }}
            rows={5}
            placeholder="Escriba aquí la novedad..."
            className="w-full p-6 text-base text-gray-950 dark:text-gray-200 bg-white dark:bg-gray-800/50 border border-black/15 dark:border-gray-700 rounded-2xl focus:border-sap-blue dark:focus:border-sap-light-blue transition-all outline-none resize-none placeholder:text-gray-500 font-bold leading-relaxed shadow-sm"
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            onClick={onClose}
            variant="secondary"
            className="rounded-xl px-6 font-bold h-11"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={!annotation.trim() || !time.trim()}
            className="bg-sap-blue text-white! px-8 h-11 rounded-xl font-black uppercase text-[11px] tracking-[0.15em] border-none shadow-lg shadow-sap-blue/20"
          >
            {isEditing ? "Actualizar Registro" : "Guardar Registro"}
          </Button>
        </div>
      </form>

      <TimePickerDialog
        isOpen={isTimePickerOpen}
        onClose={() => setIsTimePickerOpen(false)}
        onSave={(newTime) => setTime(newTime)}
        initialTime={time}
        accentColor="sap-blue"
      />
    </CinematicModal>
  );
};

export default AddNoveltyModal;
