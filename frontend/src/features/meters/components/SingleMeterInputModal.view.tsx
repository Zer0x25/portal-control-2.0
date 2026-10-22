import React from "react";

import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import CinematicModal from "../../../components/ui/CinematicModal";
import type { SingleMeterReadingValues } from "../../../schemas/forms/meter";
import type { MeterConfig } from "../../../types/dashboard";

/**
 * Spec 036 T9b: `SingleMeterInputModal` es **presentacion pura**.
 *
 * Antes el modal guardaba el valor en un `useState` y repetia (copiadas de
 * `MeterForm.tsx`) las reglas de cada tipo de medidor con un `toast` por
 * cada una. Ahora los valores, los errores y los handlers entran por props
 * (los lleva el hook de dominio).
 */
export interface SingleMeterInputModalViewProps {
  /** El modal esta abierto. */
  isOpen: boolean;
  /** Cierra el modal. */
  onClose: () => void;
  /** Medidor al que se le carga la lectura (`null` si no hay ninguno). */
  meterConfig: MeterConfig | null;
  /** Valores actuales del formulario. */
  values: SingleMeterReadingValues;
  /** Mensaje de error de un campo (o `undefined`). */
  getError: (field: string) => string | undefined;
  /** Escribe el valor del campo. */
  handleValueChange: (value: string) => void;
  /** Hay un envio en vuelo. */
  isSubmitting: boolean;
  /** Props del `<form>` (id, `noValidate` y `onSubmit` de la capa). */
  formProps: {
    id: string;
    noValidate: true;
    onSubmit: (event: { preventDefault: () => void }) => void;
    "data-app-form": string;
  };
}

const SingleMeterInputModalView: React.FC<SingleMeterInputModalViewProps> = ({
  isOpen,
  onClose,
  meterConfig,
  values,
  getError,
  handleValueChange,
  isSubmitting,
  formProps,
}) => {
  if (!isOpen || !meterConfig) {
    return null;
  }

  const placeholderText =
    meterConfig.type === "PERCENT" ? "Valor en %" : `Valor en ${meterConfig.unit}`;

  return (
    <CinematicModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Nueva Lectura: ${meterConfig.name}`}
      maxWidth="max-w-md"
    >
      <form {...formProps} className="space-y-4">
        <Input
          label="Nuevo Valor"
          id={`single-meter-input-${meterConfig.id}`}
          value={values.value}
          onChange={(e) => handleValueChange(e.target.value)}
          error={getError("value")}
          placeholder={placeholderText}
          autoComplete="off"
          autoFocus
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar Lectura"}
          </Button>
        </div>
      </form>
    </CinematicModal>
  );
};

export default SingleMeterInputModalView;
