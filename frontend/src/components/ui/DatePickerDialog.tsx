import React, { useRef, useState } from "react";
import { addMonths, format, startOfDay, subMonths } from "date-fns";
import { CloseIcon, CheckCircleIcon } from "./icons/index";
import Button from "./Button";
import { DatePickerCalendar } from "./DatePicker";

interface DatePickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
  initialDate?: string; // YYYY-MM-DD
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD
}

/**
 * Modal de seleccion de fecha. Reutiliza `DatePickerCalendar` (spec 031 T11):
 * la grilla accesible vive en un solo lugar y este componente aporta el
 * overlay, las acciones (Hoy / Limpiar / Aplicar) y el swipe horizontal.
 */
const DatePickerDialog: React.FC<DatePickerDialogProps> = ({
  isOpen,
  onClose,
  onSelect,
  initialDate,
  minDate,
  maxDate,
}) => {
  const swipeStartX = useRef<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    initialDate ? new Date(initialDate + "T12:00:00") : null,
  );
  const [viewMonth, setViewMonth] = useState<Date>(
    initialDate ? new Date(initialDate + "T12:00:00") : new Date(),
  );

  const minDateObj = minDate ? startOfDay(new Date(minDate + "T12:00:00")) : null;
  const maxDateObj = maxDate ? startOfDay(new Date(maxDate + "T12:00:00")) : null;

  if (!isOpen) return null;

  const handleSelectDay = (day: Date) => {
    if (selectedDate && day.toDateString() === selectedDate.toDateString()) {
      // Segundo click sobre el mismo dia: aplicar.
      onSelect(format(day, "yyyy-MM-dd"));
      onClose();
    } else {
      setSelectedDate(day);
    }
  };

  const handleConfirm = () => {
    if (selectedDate) {
      onSelect(format(selectedDate, "yyyy-MM-dd"));
    }
    onClose();
  };

  const handleClear = () => {
    setSelectedDate(null);
    onSelect("");
    onClose();
  };

  const handleToday = () => {
    const today = startOfDay(new Date());
    setSelectedDate(today);
    setViewMonth(today);
  };

  return (
    <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-in fade-in"
      />

      <div
        className="relative w-full max-w-[320px] bg-token-surface-card border border-token-border-technical rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 pb-2 bg-token-surface-stripe border-b border-token-border-subtle">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-token-text-tertiary">
              Seleccionar Fecha
            </span>
            <Button
              variant="none"
              type="button"
              onClick={onClose}
              className="p-1 px-2 text-token-text-tertiary hover:text-token-text-primary transition-colors shadow-none"
              aria-label="Cerrar"
              title="Cerrar"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div
          onPointerDown={(e) => {
            swipeStartX.current = e.clientX;
          }}
          onPointerUp={(e) => {
            if (swipeStartX.current === null) return;
            const dx = e.clientX - swipeStartX.current;
            swipeStartX.current = null;
            if (dx > 50) {
              setViewMonth((prev) => subMonths(prev, 1));
            } else if (dx < -50) {
              setViewMonth((prev) => addMonths(prev, 1));
            }
          }}
        >
          <DatePickerCalendar
            selectedDate={selectedDate}
            onSelect={handleSelectDay}
            minDate={minDateObj}
            maxDate={maxDateObj}
            month={viewMonth}
            onMonthChange={setViewMonth}
          />
        </div>

        {/* Actions */}
        <div className="p-4 pt-1 grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            onClick={handleToday}
            className="rounded-md h-9 text-[9px] font-black uppercase tracking-widest"
          >
            Hoy
          </Button>
          <Button
            variant="secondary"
            onClick={handleClear}
            className="rounded-md h-9 text-[9px] font-black uppercase tracking-widest text-token-text-tertiary"
          >
            Limpiar
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!selectedDate}
            className="col-span-2 rounded-md h-10 font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2"
          >
            <CheckCircleIcon className="w-3.5 h-3.5" />
            Aplicar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DatePickerDialog;
