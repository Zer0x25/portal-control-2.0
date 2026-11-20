import React from "react";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { ClockIcon, UsersIcon } from "../../../components/ui/icons/index";
import TimePickerDialog from "../../../components/ui/TimePickerDialog";
import CinematicModal from "../../../components/ui/CinematicModal";
import type { SupplierEntry } from "../../../types/index";
import type { LocalSupplierFormValues } from "../../../schemas/forms/note";

export interface AddSupplierModalViewProps {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  values: LocalSupplierFormValues;
  getError: (field: string) => string | undefined;
  handleEntryTypeChange: (value: "visit" | "provider") => void;
  handleArrivalModeChange: (value: "pedestrian" | "vehicle") => void;
  handleLicensePlateChange: (value: string) => void;
  handleDriverNameChange: (value: string) => void;
  handleCompanyChange: (value: string) => void;
  handleReasonChange: (value: string) => void;
  handlePaxCountChange: (value: string) => void;
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

export type SupplierFormPayload = Omit<SupplierEntry, "id" | "timestamp">;

type EnterKeyboardEvent = React.KeyboardEvent<HTMLInputElement>;
const advanceOnEnter = (event: EnterKeyboardEvent, nextFieldId: string) => {
  if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
  event.preventDefault();
  document.getElementById(nextFieldId)?.focus();
};

const AddSupplierModalView: React.FC<AddSupplierModalViewProps> = ({
  isOpen,
  onClose,
  isEditing,
  values,
  getError,
  handleEntryTypeChange,
  handleArrivalModeChange,
  handleLicensePlateChange,
  handleDriverNameChange,
  handleCompanyChange,
  handleReasonChange,
  handlePaxCountChange,
  handleTimeChange,
  isTimePickerOpen,
  openTimePicker,
  closeTimePicker,
  isSubmitting,
  formProps,
}) => {
  const reasonError = getError("reason");
  const reasonErrorId = `${formProps.id}-reason-error`;
  const isVehicle = values.arrivalMode === "vehicle";

  return (
    <CinematicModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <UsersIcon className="h-5 w-5 text-token-accent-brand" />
          <div>
            <h3 className="text-lg font-bold text-token-text-primary">
              {isEditing ? "Editar ingreso" : "Ingreso de personas"}
            </h3>
            <p className="mt-0.5 text-sm font-normal normal-case text-token-text-secondary">
              Registrá una visita o proveedor
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-2xl"
    >
      <form {...formProps} className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold text-token-text-primary">
            ¿Quién ingresa?
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["visit", "Visita"],
                ["provider", "Proveedor"],
              ] as const
            ).map(([entryType, label]) => (
              <label
                key={entryType}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${values.entryType === entryType ? "border-token-border-focus bg-token-surface-hover" : "border-token-border-technical bg-token-surface-header"}`}
              >
                <input
                  id={`${formProps.id}-entryType-${entryType}`}
                  type="radio"
                  name={`${formProps.id}-entryType`}
                  value={entryType}
                  checked={values.entryType === entryType}
                  onChange={() => handleEntryTypeChange(entryType)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" || event.nativeEvent.isComposing) {
                      return;
                    }
                    event.preventDefault();
                    handleEntryTypeChange(entryType);
                    document
                      .getElementById(`${formProps.id}-arrivalMode-${values.arrivalMode}`)
                      ?.focus();
                  }}
                  className="accent-token-accent-brand"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold text-token-text-primary">
            ¿Cómo ingresa?
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["pedestrian", "A pie"],
                ["vehicle", "En vehículo"],
              ] as const
            ).map(([arrivalMode, label]) => (
              <label
                key={arrivalMode}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${values.arrivalMode === arrivalMode ? "border-token-border-focus bg-token-surface-hover" : "border-token-border-technical bg-token-surface-header"}`}
              >
                <input
                  id={`${formProps.id}-arrivalMode-${arrivalMode}`}
                  type="radio"
                  name={`${formProps.id}-arrivalMode`}
                  value={arrivalMode}
                  checked={values.arrivalMode === arrivalMode}
                  onChange={() => handleArrivalModeChange(arrivalMode)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" || event.nativeEvent.isComposing) {
                      return;
                    }
                    event.preventDefault();
                    handleArrivalModeChange(arrivalMode);
                    document.getElementById(`${formProps.id}-time`)?.focus();
                  }}
                  className="accent-token-accent-brand"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className={`grid gap-3 ${isVehicle ? "sm:grid-cols-2" : "grid-cols-1"}`}>
          <div className="space-y-1.5">
            <label
              htmlFor={`${formProps.id}-time`}
              className="block text-sm font-semibold text-token-text-primary"
            >
              Hora de ingreso
            </label>
            <button
              id={`${formProps.id}-time`}
              type="button"
              onClick={openTimePicker}
              aria-label="Hora de ingreso"
              className="flex h-11 w-full items-center gap-3 rounded-lg border border-token-border-technical bg-token-surface-header px-3 text-left text-token-text-primary focus-visible:outline-2 focus-visible:outline-token-border-focus"
            >
              <ClockIcon className="h-5 w-5 text-token-accent-brand" />
              <span className="font-mono text-lg font-semibold">{values.time}</span>
            </button>
          </div>
          {isVehicle && (
            <div className="space-y-1.5">
              <label
                htmlFor={`${formProps.id}-licensePlate`}
                className="block text-sm font-semibold text-token-text-primary"
              >
                Patente
              </label>
              <Input
                id={`${formProps.id}-licensePlate`}
                aria-label="Patente"
                value={values.licensePlate}
                onChange={(event) => handleLicensePlateChange(event.target.value)}
                onKeyDown={(event) => advanceOnEnter(event, `${formProps.id}-driverName`)}
                error={getError("licensePlate")}
                placeholder="AA-BB-11"
                className="h-11 rounded-lg! px-3! font-mono! uppercase"
              />
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor={`${formProps.id}-driverName`}
              className="block text-sm font-semibold text-token-text-primary"
            >
              Nombre / responsable
            </label>
            <Input
              id={`${formProps.id}-driverName`}
              aria-label="Nombre / responsable"
              value={values.driverName}
              onChange={(event) => handleDriverNameChange(event.target.value)}
              onKeyDown={(event) => advanceOnEnter(event, `${formProps.id}-company`)}
              error={getError("driverName")}
              placeholder="Nombre completo"
              className="h-11 rounded-lg! px-3!"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor={`${formProps.id}-company`}
              className="block text-sm font-semibold text-token-text-primary"
            >
              Empresa / entidad
            </label>
            <Input
              id={`${formProps.id}-company`}
              aria-label="Empresa / entidad"
              value={values.company}
              onChange={(event) => handleCompanyChange(event.target.value)}
              onKeyDown={(event) => advanceOnEnter(event, `${formProps.id}-reason`)}
              error={getError("company")}
              placeholder="Nombre de la empresa"
              className="h-11 rounded-lg! px-3!"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
          <div className="space-y-1.5">
            <label
              htmlFor={`${formProps.id}-reason`}
              className="block text-sm font-semibold text-token-text-primary"
            >
              Motivo del ingreso
            </label>
            <textarea
              id={`${formProps.id}-reason`}
              value={values.reason}
              onChange={(event) => handleReasonChange(event.target.value)}
              placeholder="Indicá el motivo del ingreso..."
              aria-label="Motivo del ingreso"
              aria-invalid={reasonError ? "true" : undefined}
              aria-describedby={reasonError ? reasonErrorId : undefined}
              rows={3}
              className={`min-h-20 w-full resize-y rounded-lg border ${reasonError ? "border-token-status-error" : "border-token-border-technical"} bg-token-surface-header p-3 text-sm leading-relaxed text-token-text-primary placeholder:text-token-text-tertiary focus:border-token-border-focus focus:outline-none`}
            />
            <p className="text-xs text-token-text-secondary">Enter agrega una nueva línea.</p>
            {reasonError && (
              <p id={reasonErrorId} className="text-sm text-token-status-error">
                {reasonError}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor={`${formProps.id}-paxCount`}
              className="block text-sm font-semibold text-token-text-primary"
            >
              Pasajeros extra
            </label>
            <div className="relative">
              <UsersIcon className="absolute left-3 top-3 h-4 w-4 text-token-text-tertiary" />
              <Input
                id={`${formProps.id}-paxCount`}
                aria-label="Pasajeros extra"
                type="number"
                min="0"
                value={values.paxCount || ""}
                onChange={(event) => handlePaxCountChange(event.target.value)}
                onKeyDown={(event) => advanceOnEnter(event, `${formProps.id}-submit`)}
                onFocus={(event) => event.target.select()}
                error={getError("paxCount")}
                placeholder="0"
                className="h-11 rounded-lg! pl-9! pr-2!"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" onClick={onClose} variant="secondary" className="h-10 px-4">
            Cancelar
          </Button>
          <Button
            id={`${formProps.id}-submit`}
            type="submit"
            disabled={isSubmitting}
            className="h-10 px-5"
          >
            {isEditing ? "Actualizar registro" : "Guardar registro"}
          </Button>
        </div>
      </form>

      <TimePickerDialog
        isOpen={isTimePickerOpen}
        onClose={closeTimePicker}
        onSave={handleTimeChange}
        initialTime={values.time}
        accentColor="emerald"
      />
    </CinematicModal>
  );
};

export default AddSupplierModalView;
