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
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
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
            className="relative w-full max-w-[320px] bg-white dark:bg-gray-950 border border-black/5 dark:border-white/10 rounded-3xl shadow-4xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 pb-2 bg-gray-50/50 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-sap-blue/10 p-1.5 rounded-lg">
                    <CalendarDaysIcon className="w-3.5 h-3.5 text-sap-blue" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                    Seleccionar Fecha
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 px-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                >
                  <CloseIcon className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <motion.span
                    key={format(currentMonth, "MMMM")}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-base font-black text-gray-900 dark:text-white capitalize leading-tight"
                  >
                    {format(currentMonth, "MMMM", { locale: es })}
                  </motion.span>
                  <span className="text-[10px] font-black text-sap-blue tracking-widest">
                    {format(currentMonth, "yyyy")}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 hover:text-sap-blue transition-all active:scale-95 border border-transparent"
                  >
                    <ChevronLeftIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 hover:text-sap-blue transition-all active:scale-95 border border-transparent"
                  >
                    <ChevronRightIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar Body */}
            <div className="p-3">
              <div className="grid grid-cols-7 mb-1">
                {["LU", "MA", "MI", "JU", "VI", "SÁ", "DO"].map((d) => (
                  <span key={d} className="text-center text-[8px] font-black text-gray-400 py-1">
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
                    <button
                      type="button"
                      key={i}
                      onClick={() => handleSelectDay(day)}
                      disabled={isDisabled}
                      className={`
                                                relative h-9 w-full flex items-center justify-center rounded-xl text-[10px] font-black transition-all
                                                ${!isCurrentMonth ? "text-gray-300 dark:text-gray-800 opacity-30" : "text-gray-700 dark:text-gray-400"}
                                                ${isDayToday && !isSelected ? "text-sap-blue ring-1 ring-sap-blue/20 bg-sap-blue/5" : ""}
                                                ${isDisabled ? "opacity-20 cursor-not-allowed grayscale" : ""}
                                                ${
                                                  isSelected
                                                    ? "bg-sap-blue text-white shadow-lg shadow-sap-blue/30 scale-105 z-10"
                                                    : isDisabled
                                                      ? ""
                                                      : "hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                                                }
                                            `}
                    >
                      {format(day, "d")}
                      {isDayToday && !isSelected && (
                        <div className="absolute top-1 right-1 w-1 h-1 bg-sap-blue rounded-full" />
                      )}
                    </button>
                  );
                })}
              </motion.div>
            </div>

            {/* Actions */}
            <div className="p-4 pt-1 grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={handleToday}
                className="rounded-xl h-9 text-[9px] font-black uppercase tracking-widest border-black/5 dark:border-white/5"
              >
                Hoy
              </Button>
              <Button
                variant="secondary"
                onClick={handleClear}
                className="rounded-xl h-9 text-[9px] font-black uppercase tracking-widest border-black/5 dark:border-white/5 text-gray-400"
              >
                Limpiar
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirm}
                disabled={!selectedDate}
                className="col-span-2 bg-sap-blue text-white rounded-xl h-10 font-black uppercase text-[10px] tracking-[0.2em] shadow-lg disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
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
