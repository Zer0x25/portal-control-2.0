import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  startOfDay,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  CloseIcon,
  CheckCircleIcon,
} from "./icons/index";
import Button from "./Button";

interface DatePickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
  initialDate?: string; // YYYY-MM-DD
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD
}

const DatePickerDialog: React.FC<DatePickerDialogProps> = ({
  isOpen,
  onClose,
  onSelect,
  initialDate,
  minDate,
  maxDate,
}) => {
  const [currentMonth, setCurrentMonth] = useState(
    initialDate ? new Date(initialDate + "T12:00:00") : new Date(),
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    initialDate ? new Date(initialDate + "T12:00:00") : null,
  );

  const minDateObj = minDate ? startOfDay(new Date(minDate + "T12:00:00")) : null;
  const maxDateObj = maxDate ? startOfDay(new Date(maxDate + "T12:00:00")) : null;

  const isDayDisabled = (day: Date) => {
    const dayStart = startOfDay(day);
    if (minDateObj && dayStart < minDateObj) return true;
    if (maxDateObj && dayStart > maxDateObj) return true;
    return false;
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 }),
  });

  const handleSelectDay = (day: Date) => {
    if (isDayDisabled(day)) return;

    if (selectedDate && isSameDay(day, selectedDate)) {
      // Second click on same day: Apply
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
    setCurrentMonth(today);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="relative w-full max-w-[320px] bg-token-surface-card border border-token-border-technical rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 pb-2 bg-token-surface-stripe border-b border-token-border-subtle">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-token-accent-brand/10 p-1.5 rounded-md">
                    <CalendarDaysIcon className="w-3.5 h-3.5 text-token-accent-brand" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-token-text-tertiary">
                    Seleccionar Fecha
                  </span>
                </div>
                <Button
                  variant="none"
                  type="button"
                  onClick={onClose}
                  className="p-1 px-2 text-token-text-tertiary hover:text-token-text-primary transition-colors shadow-none"
                >
                  <CloseIcon className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <motion.span
                    key={format(currentMonth, "MMMM")}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-base font-black text-token-text-primary capitalize leading-tight"
                  >
                    {format(currentMonth, "MMMM", { locale: es })}
                  </motion.span>
                  <span className="text-[10px] font-black text-token-accent-brand tracking-widest">
                    {format(currentMonth, "yyyy")}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="none"
                    type="button"
                    onClick={prevMonth}
                    className="p-2 rounded-md hover:bg-token-surface-hover text-token-text-secondary hover:text-token-accent-brand transition-all active:scale-95 border border-transparent shadow-none"
                  >
                    <ChevronLeftIcon className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="none"
                    type="button"
                    onClick={nextMonth}
                    className="p-2 rounded-md hover:bg-token-surface-hover text-token-text-secondary hover:text-token-accent-brand transition-all active:scale-95 border border-transparent shadow-none"
                  >
                    <ChevronRightIcon className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Calendar Body */}
            <div className="p-3">
              <div className="grid grid-cols-7 mb-1">
                {["LU", "MA", "MI", "JU", "VI", "SÁ", "DO"].map((d) => (
                  <span
                    key={d}
                    className="text-center text-[8px] font-black text-token-text-tertiary py-1"
                  >
                    {d}
                  </span>
                ))}
              </div>
              <motion.div
                key={format(currentMonth, "yyyy-MM")}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 50) prevMonth();
                  if (info.offset.x < -50) nextMonth();
                }}
                className="grid grid-cols-7 gap-1"
              >
                {days.map((day, i) => {
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isDayToday = isToday(day);
                  const isDisabled = isDayDisabled(day);

                  return (
                    <Button
                      variant="none"
                      type="button"
                      key={i}
                      onClick={() => handleSelectDay(day)}
                      disabled={isDisabled}
                      className={`
                        relative h-9 w-full flex items-center justify-center rounded-md text-[10px] font-black transition-all shadow-none
                        ${!isCurrentMonth ? "text-token-text-tertiary/40 opacity-30" : "text-token-text-primary"}
                        ${isDayToday && !isSelected ? "text-token-accent-brand ring-1 ring-token-accent-brand/20 bg-token-accent-brand/5" : ""}
                        ${isDisabled ? "opacity-20 cursor-not-allowed grayscale" : ""}
                        ${
                          isSelected
                            ? "bg-token-accent-brand text-token-text-onAccent shadow-md scale-105 z-10"
                            : isDisabled
                              ? ""
                              : "hover:bg-token-surface-hover hover:text-token-text-primary"
                        }
                      `}
                    >
                      {format(day, "d")}
                      {isDayToday && !isSelected && (
                        <div className="absolute top-1 right-1 w-1 h-1 bg-token-accent-brand rounded-full" />
                      )}
                    </Button>
                  );
                })}
              </motion.div>
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DatePickerDialog;
