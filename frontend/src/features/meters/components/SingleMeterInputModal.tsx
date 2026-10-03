import React, { useState, useEffect } from "react";
import { useMeterReadings } from "../../../hooks/useMeterReadings";
import { useToasts } from "../../../hooks/useToasts";
import { MeterConfig } from "../../../types";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { CloseIcon } from "../../../components/ui/icons";

interface SingleMeterInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  meterConfig: MeterConfig | null;
}

const SingleMeterInputModal: React.FC<SingleMeterInputModalProps> = ({
  isOpen,
  onClose,
  meterConfig,
}) => {
  const { readings, addReading } = useMeterReadings();
  const { addToast } = useToasts();
  const [value, setValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setValue("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen || !meterConfig) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) {
      addToast("El valor no puede estar vacío.", "warning");
      return;
    }
    setIsSubmitting(true);

    const isRecharge = value.startsWith("+");
    const numericValue = parseFloat(value.replace("+", ""));

    // --- VALIDATIONS (copied from MeterForm.tsx) ---
    if (isNaN(numericValue)) {
      addToast(`Error: El valor ingresado no es un número válido.`, "error");
      setIsSubmitting(false);
      return;
    }

    if (!isRecharge && numericValue < 0) {
      addToast(`Error: El valor no puede ser negativo.`, "error");
      setIsSubmitting(false);
      return;
    }

    if (meterConfig.type === "PERCENT" && !isRecharge && numericValue > 100) {
      addToast(`Error: El porcentaje no puede ser mayor a 100.`, "error");
      setIsSubmitting(false);
      return;
    }

    if (
      meterConfig.type === "LEVEL" &&
      meterConfig.maxCapacity &&
      !isRecharge &&
      numericValue > meterConfig.maxCapacity
    ) {
      addToast(
        `Error: El valor (${numericValue}) no puede superar la capacidad máxima (${meterConfig.maxCapacity}).`,
        "error",
      );
      setIsSubmitting(false);
      return;
    }

    if (meterConfig.type === "CONSUMPTION" && !isRecharge) {
      const lastReading = readings.find((r) => r.meterConfigId === meterConfig.id);
      if (lastReading && numericValue < lastReading.normalizedValue) {
        addToast(
          `Error: El nuevo valor (${numericValue}) no puede ser menor al anterior (${lastReading.normalizedValue.toFixed(2)}).`,
          "error",
          7000,
        );
        setIsSubmitting(false);
        return;
      }
    }
    // --- END VALIDATIONS ---

    const success = await addReading([{ meterConfigId: meterConfig.id, value }]);
    if (success) {
      onClose();
    }
    setIsSubmitting(false);
  };

  const placeholderText =
    meterConfig.type === "PERCENT" ? "Valor en %" : `Valor en ${meterConfig.unit}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Nueva Lectura: {meterConfig.name}
          </h3>
          <Button
            onClick={onClose}
            variant="secondary"
            size="sm"
            className="p-1 bg-transparent! hover:bg-gray-200! dark:hover:bg-gray-700!"
          >
            <CloseIcon className="text-gray-600 dark:text-gray-300" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="Nuevo Valor"
            id={`single-meter-input-${meterConfig.id}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholderText}
            autoComplete="off"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar Lectura"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SingleMeterInputModal;
