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
            <h3 className="text-lg font-black text-token-text-primary tracking-tight uppercase">
              {isEditing ? "Editar Novedad" : "Ingreso de Novedad"}
            </h3>
            <p className="text-[9px] font-black text-token-text-secondary uppercase tracking-[0.2em] mt-0.5">
              Libro de Novedades Digital
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-token-text-secondary uppercase tracking-widest ml-4 italic">
            Hora del Evento
          </label>
          <div className="relative group cursor-pointer" onClick={handleClockClick}>
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-token-accent-brand z-10 pointer-events-none">
              <ClockIcon className="w-6 h-6 animate-pulse" />
            </div>
            <div className="relative overflow-hidden rounded-2xl bg-token-surface-card border border-token-border-subtle p-1 transition-all group-hover:border-token-accent-brand/30 shadow-inner">
              <div className="w-full h-20 pl-16 pr-8 bg-transparent text-4xl font-mono font-black text-token-text-primary dark:text-token-accent-brand outline-none relative z-10 flex items-center select-none pointer-events-none">
                {time}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-token-text-secondary uppercase tracking-widest ml-4 italic">
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
            className="w-full p-6 text-base text-token-text-primary bg-token-surface-card border border-token-border-subtle rounded-2xl focus:border-token-accent-brand transition-all outline-none resize-none placeholder:text-token-text-tertiary font-bold leading-relaxed shadow-sm"
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
            variant="primary"
            disabled={!annotation.trim() || !time.trim()}
            className="px-8 h-11 rounded-xl font-black uppercase text-[11px] tracking-[0.15em]"
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
