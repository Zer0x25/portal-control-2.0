import React, { useState } from "react";
import { useMeterReadings } from "../../../hooks/useMeterReadings";
import { useToasts } from "../../../hooks/useToasts";
import { MeterConfig } from "../../../types";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { CheckCircleIcon } from "../../../components/ui/icons";

interface MeterFormProps {
  onSaveSuccess?: () => void;
}

const MeterForm: React.FC<MeterFormProps> = ({ onSaveSuccess = () => {} }) => {
  const { meterConfigs, readings, addReading } = useMeterReadings();
  const { addToast } = useToasts();
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (id: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const readingsToSubmit = Object.entries(formValues)
      .filter(([, value]) => value.trim() !== "")
      .map(([meterConfigId, value]) => ({ meterConfigId, value }));

    // --- VALIDATIONS ---
    for (const reading of readingsToSubmit) {
      const config = meterConfigs.find((c) => c.id === reading.meterConfigId);
      if (!config) continue;

      const isRecharge = reading.value.startsWith("+");
      const numericValue = parseFloat(reading.value.replace("+", ""));

      if (isNaN(numericValue)) {
        addToast(`Error en '${config.name}': El valor ingresado no es un número válido.`, "error");
        setIsSubmitting(false);
        return;
      }

      // Validation 1: Prevent negative values for non-recharge entries.
      if (!isRecharge && numericValue < 0) {
        addToast(`Error en '${config.name}': El valor no puede ser negativo.`, "error");
        setIsSubmitting(false);
        return;
      }

      // Validation 2: For 'PERCENT' type, value must be <= 100.
      if (config.type === "PERCENT" && !isRecharge && numericValue > 100) {
        addToast(`Error en '${config.name}': El porcentaje no puede ser mayor a 100.`, "error");
        setIsSubmitting(false);
        return;
      }

      // Validation 3: For 'LEVEL' type, value must be <= maxCapacity.
      if (
        config.type === "LEVEL" &&
        config.maxCapacity &&
        !isRecharge &&
        numericValue > config.maxCapacity
      ) {
        addToast(
          `Error en '${config.name}': El valor (${numericValue}) no puede superar la capacidad máxima (${config.maxCapacity}).`,
          "error",
        );
        setIsSubmitting(false);
        return;
      }

      // Validation 4: For cumulative meters, new value can't be less than the previous one.
      if (config.type === "CONSUMPTION" && !isRecharge) {
        const lastReading = readings.find((r) => r.meterConfigId === config.id);
        if (lastReading && numericValue < lastReading.normalizedValue) {
          addToast(
            `Error en '${config.name}': El nuevo valor (${numericValue}) no puede ser menor al anterior (${lastReading.normalizedValue.toFixed(2)}).`,
            "error",
            7000,
          );
          setIsSubmitting(false);
          return;
        }
      }
    }

    if (readingsToSubmit.length > 0) {
      const success = await addReading(readingsToSubmit);
      if (success) {
        setFormValues({}); // Clear form on successful submission
        onSaveSuccess();
      }
    }
    setIsSubmitting(false);
  };

  const renderMeterInput = (config: MeterConfig) => {
    const lastReading = readings.find((r) => r.meterConfigId === config.id);
    const currentValue = formValues[config.id] || "";

    let subText = null;
    if (lastReading) {
      if (config.type === "CONSUMPTION") {
        const lastValue = lastReading.normalizedValue;
        const delta = parseFloat(currentValue) - lastValue;
        subText = `Última: ${lastValue.toFixed(2)} ${config.unit}.`;
        if (!isNaN(delta) && currentValue && !currentValue.startsWith("+")) {
          subText += ` Consumo: ${delta.toFixed(2)} ${config.unit}.`;
        }
      } else if (config.type === "LEVEL" || config.type === "PERCENT") {
        subText = `Nivel anterior: ${lastReading.normalizedValue.toFixed(2)} ${config.unit}.`;
      }
    }

    let progress = null;
    if ((config.type === "LEVEL" || config.type === "PERCENT") && config.maxCapacity) {
      const percentage =
        config.type === "PERCENT"
          ? parseFloat(currentValue)
          : (parseFloat(currentValue) / config.maxCapacity) * 100;

      if (!isNaN(percentage)) {
        progress = (
          <div className="w-full bg-token-surface-stripe border border-token-border-subtle rounded-full h-1.5 mt-1">
            <div
              className="bg-sap-blue h-1.5 rounded-full"
              style={{ width: `${Math.min(percentage, 100)}%` }}
            ></div>
          </div>
        );
      }
    }

    const placeholderText = config.type === "PERCENT" ? "Valor en %" : `Valor en ${config.unit}`;

    return (
      <div
        key={config.id}
        className="p-3 border rounded-md border-token-border-subtle bg-token-surface-stripe flex flex-col justify-between min-h-[100px]"
      >
        <Input
          label={config.name}
          id={`meter-${config.id}`}
          value={currentValue}
          onChange={(e) => handleInputChange(config.id, e.target.value)}
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
  };

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {meterConfigs.length > 0 ? (
            meterConfigs.map(renderMeterInput)
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

export default MeterForm;
