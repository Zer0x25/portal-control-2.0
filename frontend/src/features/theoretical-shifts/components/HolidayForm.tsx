import React, { useState, useEffect } from "react";
import { Holiday } from "../../../types/index";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
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
      <h3 className="text-lg font-bold text-token-text-primary flex items-center gap-2">
        <div className="w-2 h-6 bg-token-accent-brand rounded-full"></div>
        {initialData ? "Actualizar Feriado" : "Nuevo Feriado"}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
        {/* Date Picker */}
        <div className="relative group">
          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-token-text-secondary mb-2 pl-1">
            Fecha
          </label>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsDatePickerOpen(true)}
            className="w-full px-4 py-3 justify-between text-token-text-primary text-left font-normal"
          >
            <span>
              {date ? new Date(date + "T12:00:00").toLocaleDateString("es-CL") : "Seleccionar"}
            </span>
            <ChevronRightIcon className="w-4 h-4 text-token-accent-brand rotate-90 opacity-60" />
          </Button>
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
        />

        {/* Type Select */}
        <Select
          label="Tipo"
          value={type}
          onChange={(e) => setType(e.target.value as Holiday["type"])}
          options={HOLIDAY_TYPES.map((t) => ({ value: t, label: t }))}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" className="px-8 flex items-center gap-2">
          {initialData ? <EditIcon className="w-5 h-5" /> : <PlusCircleIcon className="w-5 h-5" />}
          {initialData ? "Actualizar" : "Guardar"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} className="px-8">
          Cancelar
        </Button>
      </div>
    </form>
  );
};

export default HolidayForm;
