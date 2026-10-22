import React from "react";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import {
  ClockIcon,
  FingerPrintIcon,
  UserIcon,
  HomeIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon,
} from "../../../components/ui/icons/index";
import { SupplierEntry } from "../../../types/index";
import TimePickerDialog from "../../../components/ui/TimePickerDialog";
import CinematicModal from "../../../components/ui/CinematicModal";
import { Z } from "../../../constants/zScale";
import type { LocalSupplierFormValues } from "../../../schemas/forms/note";

/**
 * Spec 036 T10: `AddSupplierModal` es **presentacion pura**.
 *
 * Antes el componente guardaba los seis campos de la entrega en un `useState`,
 * con la mascara de la patente escrita a mano y la comprobacion de campos
 * obligatorios repetida en tres sitios. Ahora los valores, los errores y los
 * handlers entran por props (los lleva el hook de dominio).
 */
export interface AddSupplierModalViewProps {
  /** El modal esta abierto. */
  isOpen: boolean;
  /** Cierra el modal. */
  onClose: () => void;
  /** Se esta editando un registro (no se muestra "Ingreso"). */
  isEditing: boolean;
  /** Valores actuales del formulario. */
  values: LocalSupplierFormValues;
  /** Mensaje de error de un campo (o `undefined`). */
  getError: (field: string) => string | undefined;
  /** Escribe la patente (con la mascara de la pantalla). */
  handleLicensePlateChange: (value: string) => void;
  /** Escribe el conductor. */
  handleDriverNameChange: (value: string) => void;
  /** Escribe la empresa. */
  handleCompanyChange: (value: string) => void;
  /** Escribe el motivo del ingreso. */
  handleReasonChange: (value: string) => void;
  /** Escribe el numero de pasajeros. */
  handlePaxCountChange: (value: string) => void;
  /** Escribe la hora del ingreso. */
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

/** Tipo del registro que entrega el formulario (sin id ni marca de tiempo). */
export type SupplierFormPayload = Omit<SupplierEntry, "id" | "timestamp">;

const AddSupplierModalView: React.FC<AddSupplierModalViewProps> = ({
  isOpen,
  onClose,
  isEditing,
  values,
  getError,
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
  submit,
  formProps,
}) => {
  const reasonError = getError("reason");
  const reasonErrorId = `${formProps.id}-reason-error`;

  return (
    <CinematicModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500/10 dark:bg-emerald-500/20 p-2.5 rounded-xl border border-emerald-500/20">
            <UsersIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-token-text-primary tracking-tight uppercase italic leading-none">
              {isEditing ? "Editar Proveedor" : "Ingreso de Proveedor"}
            </h3>
            <p className="text-xxs font-black text-token-text-secondary uppercase tracking-[0.2em] mt-1 italic leading-none">
              Control de Acceso Vehicular
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-xl"
    >
      <form {...formProps} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-token-text-secondary uppercase tracking-widest ml-4 italic">
              Hora del Ingreso
            </label>
            <div className="relative group cursor-pointer" onClick={openTimePicker}>
              <div
                className={`absolute left-6 top-1/2 -translate-y-1/2 text-emerald-500 ${Z.sticky} pointer-events-none`}
              >
                <ClockIcon className="w-6 h-6 animate-pulse" />
              </div>
              <div className="relative overflow-hidden rounded-2xl bg-token-surface-card border border-token-border-subtle p-1 transition-all group-hover:border-emerald-500/30 shadow-inner">
                <div
                  className={`w-full h-20 pl-16 pr-8 bg-transparent text-4xl font-mono font-black text-token-text-primary dark:text-emerald-400 outline-none relative ${Z.sticky} flex items-center select-none pointer-events-none`}
                >
                  {values.time}
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label
              htmlFor={`${formProps.id}-licensePlate`}
              className="text-[10px] font-black text-token-text-secondary uppercase tracking-widest ml-4 italic"
            >
              Patente Vehicular
            </label>
            <div className="relative group">
              <div
                className={`absolute left-4 top-1/2 -translate-y-1/2 text-token-text-tertiary ${Z.sticky} pointer-events-none`}
              >
                <FingerPrintIcon className="w-5 h-5" />
              </div>
              <Input
                id={`${formProps.id}-licensePlate`}
                value={values.licensePlate}
                onChange={(e) => handleLicensePlateChange(e.target.value)}
                error={getError("licensePlate")}
                placeholder="AA-BB-11"
                className="pl-12! bg-token-surface-card! rounded-2xl! h-20! font-black! tracking-[0.2em]! text-2xl! text-token-text-primary! shadow-inner uppercase italic border-none"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor={`${formProps.id}-driverName`}
            className="text-[10px] font-black text-token-text-secondary uppercase tracking-widest ml-4 italic"
          >
            Conductor / Responsable
          </label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-token-text-tertiary">
              <UserIcon className="w-5 h-5" />
            </div>
            <Input
              id={`${formProps.id}-driverName`}
              value={values.driverName}
              onChange={(e) => handleDriverNameChange(e.target.value)}
              error={getError("driverName")}
              placeholder="Nombre completo del conductor"
              className="pl-12! bg-token-surface-card! rounded-2xl! h-12! text-token-text-primary! font-bold italic border-none shadow-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label
              htmlFor={`${formProps.id}-company`}
              className="text-[10px] font-black text-token-text-secondary uppercase tracking-widest ml-4 italic"
            >
              Empresa / Entidad
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-token-text-tertiary">
                <HomeIcon className="w-5 h-5" />
              </div>
              <Input
                id={`${formProps.id}-company`}
                value={values.company}
                onChange={(e) => handleCompanyChange(e.target.value)}
                error={getError("company")}
                placeholder="Nombre de la empresa"
                className="pl-12! bg-token-surface-card! rounded-2xl! h-12! text-token-text-primary! font-bold italic border-none shadow-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label
              htmlFor={`${formProps.id}-paxCount`}
              className="text-[10px] font-black text-token-text-secondary uppercase tracking-widest ml-4 italic"
            >
              Pasajeros Extra
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-token-text-tertiary">
                <UsersIcon className="w-5 h-5" />
              </div>
              <Input
                id={`${formProps.id}-paxCount`}
                type="number"
                min="0"
                value={values.paxCount || ""}
                onChange={(e) => handlePaxCountChange(e.target.value)}
                onFocus={(e) => e.target.select()}
                error={getError("paxCount")}
                className="pl-12! bg-token-surface-card! rounded-2xl! h-12! text-token-text-primary! font-black italic border-none shadow-sm"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor={`${formProps.id}-reason`}
            className="text-[10px] font-black text-token-text-secondary uppercase tracking-widest ml-4 italic"
          >
            Motivo del Ingreso
          </label>
          <div className="relative group">
            <div className="absolute left-4 top-6 text-token-text-tertiary">
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
            </div>
            <textarea
              id={`${formProps.id}-reason`}
              value={values.reason}
              onChange={(e) => handleReasonChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Escriba aquí el motivo del ingreso..."
              aria-label="Motivo del Ingreso"
              aria-invalid={reasonError ? "true" : undefined}
              aria-describedby={reasonError ? reasonErrorId : undefined}
              className={`w-full pl-12 pr-6 py-4 text-base text-token-text-primary bg-token-surface-card border ${reasonError ? "border-token-status-error" : "border-none"} rounded-2xl focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none resize-none h-28 font-bold leading-relaxed shadow-sm italic`}
            />
            {reasonError && (
              <p
                id={reasonErrorId}
                className="ml-4 text-[10px] font-black uppercase tracking-widest text-token-status-error animate-pulse"
              >
                {reasonError}
              </p>
            )}
          </div>
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
            disabled={isSubmitting}
            className="bg-emerald-500 text-white! px-8 h-11 rounded-xl font-black uppercase text-[11px] tracking-[0.15em] border-none shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
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
        accentColor="emerald"
      />
    </CinematicModal>
  );
};

export default AddSupplierModalView;
