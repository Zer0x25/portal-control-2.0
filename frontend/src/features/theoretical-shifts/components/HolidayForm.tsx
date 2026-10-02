import React, { useState, useEffect } from "react";
import { Holiday } from "../../../types/index";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { PlusCircleIcon, EditIcon, ChevronRightIcon } from "../../../components/ui/icons/index";
import DatePickerDialog from "../../../components/ui/DatePickerDialog";
import { HOLIDAY_TYPES } from "../../../utils/mappings";
import { useToasts } from "../../../hooks/useToasts";

interface HolidayFormProps {
  initialData?: Holiday | null;
  onSave: (holiday: { name: string; date: string; type: Holiday["type"] }) => Promise<void>;
  onCancel: () => void;
  existingDates: string[];
}

const HolidayForm: React.FC<HolidayFormProps> = ({
  initialData,
  onSave,
  onCancel,
  existingDates,
}) => {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<Holiday["type"]>("Nacional");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const { addToast } = useToasts();

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDate(initialData.date);
      setType(initialData.type);
    } else {
      setName("");
      setDate("");
      setType("Nacional");
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date) {
      addToast("Nombre y fecha son requeridos.", "warning");
      return;
    }

    if (existingDates.includes(date) && (!initialData || initialData.date !== date)) {
      addToast("Ya existe un feriado en esta fecha.", "error");
      return;
    }

    try {
      await onSave({ name, date, type });
      // Reset form if success (though typically parent closes/resets)
      if (!initialData) {
        setName("");
        setDate("");
        setType("Nacional");
      }
    } catch {
      // Error handling by parent usually
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <div className="w-2 h-6 bg-sap-blue dark:bg-sap-light-blue rounded-full"></div>
        {initialData ? "Actualizar Feriado" : "Nuevo Feriado"}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Date Picker */}
        <div className="relative group">
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 pl-1">
            Fecha
          </label>
          <button
            type="button"
            onClick={() => setIsDatePickerOpen(true)}
            className="w-full px-4 py-3 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sap-blue outline-none transition-all dark:text-gray-100 text-left flex justify-between items-center hover:border-sap-blue/30"
          >
            <span>
              {date ? new Date(date + "T12:00:00").toLocaleDateString("es-CL") : "Seleccionar"}
            </span>
            <ChevronRightIcon className="w-4 h-4 text-sap-blue rotate-90 opacity-40" />
          </button>
          <DatePickerDialog
            isOpen={isDatePickerOpen}
            onClose={() => setIsDatePickerOpen(false)}
            onSelect={(selectedDate) => setDate(selectedDate)}
            initialDate={date}
          />
        </div>

        {/* Name Input */}
        <Input
          label="Nombre del Feriado"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Ej: Año Nuevo"
          className="!rounded-xl"
        />

        {/* Type Select */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 pl-1">
            Tipo
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as Holiday["type"])}
            className="w-full px-4 py-3 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sap-blue outline-none transition-all dark:text-gray-100 appearance-none"
          >
            {HOLIDAY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" className="px-8 flex items-center gap-2 rounded-xl">
          {initialData ? <EditIcon className="w-5 h-5" /> : <PlusCircleIcon className="w-5 h-5" />}
          {initialData ? "Actualizar" : "Guardar"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} className="px-8 rounded-xl">
          Cancelar
        </Button>
      </div>
    </form>
  );
};

export default HolidayForm;
