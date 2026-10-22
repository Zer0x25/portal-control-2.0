import React from "react";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { CloseIcon, SparklesIcon } from "../../../components/ui/icons/index";
import { Z } from "../../../constants/zScale";
import type { SeedingOptionsFormValues } from "../../../schemas/forms/seed";

/**
 * Spec 036 T10b: `SeedingOptionsModal` es **presentacion pura**.
 *
 * Antes el componente guardaba los siete numeros en un `useState` y repetia
 * la comprobacion de rangos en un `toast` que no decia que campo era el
 * culpable. Ahora los valores, los errores y los handlers entran por props
 * (los lleva el hook de dominio).
 */
export interface SeedingOptionsModalViewProps {
  /** El modal esta abierto. */
  isOpen: boolean;
  /** Cierra el modal. */
  onClose: () => void;
  /** Valores actuales del formulario. */
  values: SeedingOptionsFormValues;
  /** Mensaje de error de un campo (o `undefined`). */
  getError: (field: string) => string | undefined;
  /** Escribe un campo numerico. */
  handleNumberChange: (field: keyof SeedingOptionsFormValues, value: string) => void;
  /** Aplica el preset "Quick Seed". */
  applyQuickSeedPreset: () => void;
  /** Aplica el siguiente nivel del preset incremental. */
  applyIncrementalPreset: () => void;
  /** Nivel del preset incremental aplicado. */
  incrementalLevel: number;
  /** Numero total de niveles del preset incremental. */
  maxIncrementalLevel: number;
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

const SeedingOptionsModalView: React.FC<SeedingOptionsModalViewProps> = ({
  isOpen,
  onClose,
  values,
  getError,
  handleNumberChange,
  applyQuickSeedPreset,
  applyIncrementalPreset,
  incrementalLevel,
  maxIncrementalLevel,
  isSubmitting,
  formProps,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 ${Z.modal} flex items-center justify-center bg-black/70 p-4`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="seeding-options-title"
    >
      <div
        className="bg-token-surface-card text-token-text-primary rounded-lg shadow-2xl border border-token-border-subtle w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-token-border-subtle flex justify-between items-center">
          <h3 id="seeding-options-title" className="font-semibold text-lg flex items-center">
            <SparklesIcon className="w-5 h-5 mr-2 text-yellow-400" />
            Panel de Simulacion de Datos
          </h3>
          <Button
            type="button"
            variant="none"
            onClick={onClose}
            className="p-1 rounded-full text-token-text-tertiary hover:text-token-text-primary hover:bg-token-surface-stripe shadow-none"
            aria-label="Cerrar modal"
          >
            <CloseIcon className="w-5 h-5" />
          </Button>
        </div>
        <form {...formProps}>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-md border border-token-border-subtle bg-token-surface-stripe">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-token-text-primary">
                  Quick Seed
                </p>
                <p className="text-[11px] text-token-text-secondary">
                  15 empleados, 3 dias, sin carga pesada para validacion manual.
                </p>
              </div>
              <Button type="button" variant="secondary" onClick={applyQuickSeedPreset}>
                Aplicar
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-md border border-token-border-subtle bg-token-surface-stripe">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-token-text-primary">
                  Incremental
                </p>
                <p className="text-[11px] text-token-text-secondary">
                  Sube carga por niveles para stress testing controlado.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={applyIncrementalPreset}
                disabled={incrementalLevel >= maxIncrementalLevel}
              >
                Nivel +1
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="N Empleados"
                type="number"
                name="employees"
                value={values.employees}
                onChange={(e) => handleNumberChange("employees", e.target.value)}
                error={getError("employees")}
                min="1"
                max="3000"
              />
              <Input
                label="Dias de Historial"
                type="number"
                name="days"
                value={values.days}
                onChange={(e) => handleNumberChange("days", e.target.value)}
                error={getError("days")}
                min="1"
                max="7300"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Patrones Base"
                type="number"
                name="basePatternsCount"
                value={values.basePatternsCount}
                onChange={(e) => handleNumberChange("basePatternsCount", e.target.value)}
                error={getError("basePatternsCount")}
                min="1"
                max="12"
              />
              <Input
                label="% Ausentismo"
                type="number"
                name="leaveRatio"
                value={values.leaveRatio}
                onChange={(e) => handleNumberChange("leaveRatio", e.target.value)}
                error={getError("leaveRatio")}
                min="0"
                max="100"
              />
              <Input
                label="% Correcciones"
                type="number"
                name="correctionRequestRatio"
                value={values.correctionRequestRatio}
                onChange={(e) => handleNumberChange("correctionRequestRatio", e.target.value)}
                error={getError("correctionRequestRatio")}
                min="0"
                max="100"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Reportes Turno/dia"
                type="number"
                name="shiftReportsPerDay"
                value={values.shiftReportsPerDay}
                onChange={(e) => handleNumberChange("shiftReportsPerDay", e.target.value)}
                error={getError("shiftReportsPerDay")}
                min="0"
                max="6"
              />
              <Input
                label="Quick Notes"
                type="number"
                name="quickNotesCount"
                value={values.quickNotesCount}
                onChange={(e) => handleNumberChange("quickNotesCount", e.target.value)}
                error={getError("quickNotesCount")}
                min="0"
                max="2000"
              />
            </div>

            <div className="pt-4 text-xs text-token-text-secondary border-t border-token-border-subtle mt-2">
              <p>
                * Patrones Base define cuantas plantillas de turno se crean y se distribuyen en
                forma pareja.
              </p>
              <p>* El % de Correcciones se aplica a los registros recientes completados.</p>
              <p>* El % de Ausentismo ahora tambien se usa para crear Leave Records.</p>
              <p>* Reportes de turno se generan sobre una ventana maxima de 365 dias.</p>
            </div>
          </div>
          <div className="p-4 border-t border-token-border-subtle flex justify-end gap-2">
            <Button type="button" onClick={onClose} variant="secondary">
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              Iniciar Simulacion
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SeedingOptionsModalView;
