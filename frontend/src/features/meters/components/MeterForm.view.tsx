import React from "react";

import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { CheckCircleIcon } from "../../../components/ui/icons";
import type { MeterReadingsValues } from "../../../schemas/forms/meter";
import type { MeterConfig } from "../../../types/dashboard";

/**
 * Spec 036 T9b: `MeterForm` es **presentacion pura**.
 *
 * Antes el componente guardaba los valores de cada medidor y hacia las
 * validaciones a mano. Ahora los valores, los errores y los handlers entran
 * por props (los lleva el hook de dominio).
 */
export interface MeterFormViewProps {
  /** Valor escrito en cada medidor (por id de medidor). */
  values: MeterReadingsValues;
  /** Mensaje de error de un medidor (o `undefined`). */
  getError: (field: string) => string | undefined;
  /** Escribe el valor de un medidor. */
  setValue: (name: string, value: string | undefined) => void;
  /** Medidores configurados. */
  meterConfigs: readonly MeterConfig[];
  /** Ultima lectura de cada medidor (por id). */
  lastReadingById: Readonly<Record<string, number>>;
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

const MeterFormView: React.FC<MeterFormViewProps> = ({
  values,
  getError,
  setValue,
  meterConfigs,
  lastReadingById,
  isSubmitting,
  formProps,
}) => {
  /** Texto auxiliar con la ultima lectura y el consumo. */
  const buildSubText = (config: MeterConfig, currentValue: string): string | null => {
    const lastValue = lastReadingById[config.id];
    if (lastValue === undefined) return null;

    if (config.type === "CONSUMPTION") {
      const delta = Number.parseFloat(currentValue) - lastValue;
      let text = `Última: ${lastValue.toFixed(2)} ${config.unit}.`;
      if (!Number.isNaN(delta) && currentValue && !currentValue.startsWith("+")) {
        text += ` Consumo: ${delta.toFixed(2)} ${config.unit}.`;
      }
      return text;
    }

    if (config.type === "LEVEL" || config.type === "PERCENT") {
      return `Nivel anterior: ${lastValue.toFixed(2)} ${config.unit}.`;
    }

    return null;
  };

  /** Barra de progreso del nivel (medidores de nivel y porcentaje). */
  const buildProgress = (config: MeterConfig, currentValue: string): React.ReactNode => {
    if ((config.type !== "LEVEL" && config.type !== "PERCENT") || !config.maxCapacity) return null;

    const percentage =
      config.type === "PERCENT"
        ? Number.parseFloat(currentValue)
        : (Number.parseFloat(currentValue) / config.maxCapacity) * 100;

    if (Number.isNaN(percentage)) return null;

    return (
      <div className="w-full bg-token-surface-stripe border border-token-border-subtle rounded-full h-1.5 mt-1">
        <div
          className="bg-token-accent-brand h-1.5 rounded-full"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
    );
  };

  return (
    <div className="p-4">
      <form {...formProps} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {meterConfigs.length > 0 ? (
            meterConfigs.map((config) => {
              const currentValue = values[config.id] || "";
              const error = getError(config.id);
              const subText = buildSubText(config, currentValue);
              const progress = buildProgress(config, currentValue);
              const placeholderText =
                config.type === "PERCENT" ? "Valor en %" : `Valor en ${config.unit}`;

              return (
                <div
                  key={config.id}
                  className="p-3 border rounded-md border-token-border-subtle bg-token-surface-stripe flex flex-col justify-between min-h-[100px]"
                >
                  <Input
                    label={config.name}
                    id={`meter-${config.id}`}
                    value={currentValue}
                    onChange={(e) => setValue(config.id, e.target.value)}
                    error={error}
                    placeholder={placeholderText}
                    autoComplete="off"
                  />
                  {subText && (
                    <p className="text-[10px] font-black text-token-text-tertiary uppercase tracking-tight mt-1">
                      {subText}
                    </p>
                  )}
                  {progress}
                </div>
              );
            })
          ) : (
            <p className="text-center text-sm text-token-text-tertiary font-bold py-4 col-span-full">
              No hay medidores configurados. Por favor, añada medidores usando el botón "Configurar
              Medidores".
            </p>
          )}
        </div>

        {meterConfigs.length > 0 && (
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center items-center gap-2"
          >
            <CheckCircleIcon className="w-5 h-5" />
            {isSubmitting ? "Guardando..." : "Guardar Lecturas"}
          </Button>
        )}
      </form>
    </div>
  );
};

export default MeterFormView;
