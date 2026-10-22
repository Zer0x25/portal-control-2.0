import React from "react";
import Button from "../../../components/ui/Button";
import { BookOpenIcon, ClockIcon } from "../../../components/ui/icons/index";
import TimePickerDialog from "../../../components/ui/TimePickerDialog";
import CinematicModal from "../../../components/ui/CinematicModal";
import { Z } from "../../../constants/zScale";
import type { LocalNoveltyFormValues } from "../../../schemas/forms/note";

/**
 * Spec 036 T10: `AddNoveltyModal` es **presentacion pura**.
 *
 * Antes el componente guardaba la anotacion y la hora en dos `useState` y
 * repetia la comprobacion de campos vacios en tres sitios. Ahora los valores,
 * los errores y los handlers entran por props (los lleva el hook de dominio).
 */
export interface AddNoveltyModalViewProps {
  /** El modal esta abierto. */
  isOpen: boolean;
  /** Cierra el modal. */
  onClose: () => void;
  /** Se esta editando una novedad (no se muestra "Ingreso"). */
  isEditing: boolean;
  /** Valores actuales del formulario. */
  values: LocalNoveltyFormValues;
  /** Mensaje de error de un campo (o `undefined`). */
  getError: (field: string) => string | undefined;
  /** Escribe la anotacion. */
  handleAnnotationChange: (value: string) => void;
  /** Escribe la hora del evento. */
  handleTimeChange: (value: string) => void;
  /** El selector de hora esta abierto. */
  isTimePickerOpen: boolean;
  /** Abre el selector de hora. */
  openTimePicker: () => void;
  /** Cierra el selector de hora. */
  closeTimePicker: () => void;
  /** Hay un envio en vuelo. */
  isSubmitting: boolean;
  /** Envia el formulario (validando antes). */
  submit: () => void;
  /** Props del `<form>` (id, `noValidate` y `onSubmit` de la capa). */
  formProps: {
    id: string;
    noValidate: true;
    onSubmit: (event: { preventDefault: () => void }) => void;
    "data-app-form": string;
  };
}

const AddNoveltyModalView: React.FC<AddNoveltyModalViewProps> = ({
  isOpen,
  onClose,
  isEditing,
  values,
  getError,
  handleAnnotationChange,
  handleTimeChange,
  isTimePickerOpen,
  openTimePicker,
  closeTimePicker,
  isSubmitting,
  submit,
  formProps,
}) => {
  const annotationError = getError("annotation");
  const annotationErrorId = `${formProps.id}-annotation-error`;

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
            <p className="text-xxs font-black text-token-text-secondary uppercase tracking-[0.2em] mt-0.5">
              Libro de Novedades Digital
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-lg"
    >
      <form {...formProps} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-token-text-secondary uppercase tracking-widest ml-4 italic">
            Hora del Evento
          </label>
          <div className="relative group cursor-pointer" onClick={openTimePicker}>
            <div
              className={`absolute left-6 top-1/2 -translate-y-1/2 text-token-accent-brand ${Z.sticky} pointer-events-none`}
            >
              <ClockIcon className="w-6 h-6 animate-pulse" />
            </div>
            <div className="relative overflow-hidden rounded-2xl bg-token-surface-card border border-token-border-subtle p-1 transition-all group-hover:border-token-accent-brand/30 shadow-inner">
              <div
                className={`w-full h-20 pl-16 pr-8 bg-transparent text-4xl font-mono font-black text-token-text-primary dark:text-token-accent-brand outline-none relative ${Z.sticky} flex items-center select-none pointer-events-none`}
              >
                {values.time}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor={`${formProps.id}-annotation`}
            className="text-[10px] font-black text-token-text-secondary uppercase tracking-widest ml-4 italic"
          >
            Detalle de la anotación
          </label>
          <textarea
            id={`${formProps.id}-annotation`}
            value={values.annotation}
            onChange={(e) => handleAnnotationChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={5}
            placeholder="Escriba aquí la novedad..."
            aria-label="Detalle de la anotación"
            aria-invalid={annotationError ? "true" : undefined}
            aria-describedby={annotationError ? annotationErrorId : undefined}
            className={`w-full p-6 text-base text-token-text-primary bg-token-surface-card border ${annotationError ? "border-token-status-error" : "border-token-border-subtle"} rounded-2xl focus:border-token-accent-brand transition-all outline-none resize-none placeholder:text-token-text-tertiary font-bold leading-relaxed shadow-sm`}
            required
          />
          {annotationError && (
            <p
              id={annotationErrorId}
              className="ml-4 text-[10px] font-black uppercase tracking-widest text-token-status-error animate-pulse"
            >
              {annotationError}
            </p>
          )}
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
            disabled={isSubmitting}
            className="px-8 h-11 rounded-xl font-black uppercase text-[11px] tracking-[0.15em]"
          >
            {isEditing ? "Actualizar Registro" : "Guardar Registro"}
          </Button>
        </div>
      </form>

      <TimePickerDialog
        isOpen={isTimePickerOpen}
        onClose={closeTimePicker}
        onSave={handleTimeChange}
        initialTime={values.time}
        accentColor="sap-blue"
      />
    </CinematicModal>
  );
};

export default AddNoveltyModalView;
