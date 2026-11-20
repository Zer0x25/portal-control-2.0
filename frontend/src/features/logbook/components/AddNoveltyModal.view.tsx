import React from "react";
import Button from "../../../components/ui/Button";
import { BookOpenIcon, ClockIcon } from "../../../components/ui/icons/index";
import TimePickerDialog from "../../../components/ui/TimePickerDialog";
import CinematicModal from "../../../components/ui/CinematicModal";
import type { LocalNoveltyFormValues } from "../../../schemas/forms/note";

export interface AddNoveltyModalViewProps {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  values: LocalNoveltyFormValues;
  getError: (field: string) => string | undefined;
  handleAnnotationChange: (value: string) => void;
  handleTimeChange: (value: string) => void;
  isTimePickerOpen: boolean;
  openTimePicker: () => void;
  closeTimePicker: () => void;
  isSubmitting: boolean;
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
  formProps,
}) => {
  const annotationError = getError("annotation");
  const annotationErrorId = `${formProps.id}-annotation-error`;

  return (
    <CinematicModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <BookOpenIcon className="h-5 w-5 text-token-accent-brand" />
          <div>
            <h3 className="text-lg font-bold text-token-text-primary">
              {isEditing ? "Editar novedad" : "Ingreso de novedad"}
            </h3>
            <p className="mt-0.5 text-sm font-normal normal-case text-token-text-secondary">
              Registrá lo ocurrido durante el turno
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-lg"
    >
      <form {...formProps} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor={`${formProps.id}-time`}
            className="block text-sm font-semibold text-token-text-primary"
          >
            Hora del evento
          </label>
          <button
            id={`${formProps.id}-time`}
            type="button"
            onClick={openTimePicker}
            aria-label="Hora del evento"
            className="flex h-11 w-full items-center gap-3 rounded-lg border border-token-border-technical bg-token-surface-header px-3 text-left text-token-text-primary focus-visible:outline-2 focus-visible:outline-token-border-focus"
          >
            <ClockIcon className="h-5 w-5 text-token-accent-brand" />
            <span className="font-mono text-lg font-semibold">{values.time}</span>
          </button>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={`${formProps.id}-annotation`}
            className="block text-sm font-semibold text-token-text-primary"
          >
            Detalle de la anotación
          </label>
          <textarea
            id={`${formProps.id}-annotation`}
            value={values.annotation}
            onChange={(event) => handleAnnotationChange(event.target.value)}
            rows={4}
            placeholder="Describí lo ocurrido..."
            aria-label="Detalle de la anotación"
            aria-invalid={annotationError ? "true" : undefined}
            aria-describedby={annotationError ? annotationErrorId : undefined}
            className={`min-h-24 w-full resize-y rounded-lg border ${annotationError ? "border-token-status-error" : "border-token-border-technical"} bg-token-surface-header p-3 text-sm leading-relaxed text-token-text-primary placeholder:text-token-text-tertiary focus:border-token-border-focus focus:outline-none`}
            required
          />
          <p className="text-xs text-token-text-secondary">Enter agrega una nueva línea.</p>
          {annotationError && (
            <p id={annotationErrorId} className="text-sm text-token-status-error">
              {annotationError}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" onClick={onClose} variant="secondary" className="h-10 px-4">
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting} className="h-10 px-5">
            {isEditing ? "Actualizar registro" : "Guardar registro"}
          </Button>
        </div>
      </form>

      <TimePickerDialog
        isOpen={isTimePickerOpen}
        onClose={closeTimePicker}
        onSave={handleTimeChange}
        initialTime={values.time}
        accentColor="token-accent-brand"
      />
    </CinematicModal>
  );
};

export default AddNoveltyModalView;
