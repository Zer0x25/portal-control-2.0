import React, { useState, useRef, useEffect } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  eachDayOfInterval,
  parseISO,
  isValid,
} from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, XCircleIcon } from "./icons/index";
import Button from "./Button";

interface GlassDatePickerProps {
  label?: string;
  value: string; // ISO format YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  maxDate?: string | Date; // Added maxDate prop
  minDate?: string | Date;
}

const GlassDatePicker: React.FC<GlassDatePickerProps> = ({
  label,
  value,
  onChange,
  className = "",
  placeholder = "Seleccionar fecha",
  maxDate,
  minDate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse value to Date object for internal use
  const selectedDate = value ? parseISO(value) : null;
  const maxDateObj = maxDate ? (typeof maxDate === "string" ? parseISO(maxDate) : maxDate) : null;
  const minDateObj = minDate ? (typeof minDate === "string" ? parseISO(minDate) : minDate) : null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between px-4 py-3 border-b border-token-border-technical bg-token-surface-header">
        <Button
          variant="none"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setCurrentMonth(subMonths(currentMonth, 1));
          }}
          className="p-1.5 rounded-md hover:bg-token-surface-hover transition-colors border border-transparent hover:border-token-border-subtle shadow-none"
        >
          <ChevronLeftIcon className="w-4 h-4 text-token-text-tertiary" />
        </Button>
        <span className="text-[11px] font-black uppercase tracking-widest text-token-text-primary">
          {format(currentMonth, "MMMM yyyy", { locale: es })}
        </span>
        <Button
          variant="none"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setCurrentMonth(addMonths(currentMonth, 1));
          }}
          className="p-1.5 rounded-md hover:bg-token-surface-hover transition-colors border border-transparent hover:border-token-border-subtle shadow-none"
        >
          <ChevronRightIcon className="w-4 h-4 text-token-text-tertiary" />
        </Button>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const dateNames = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];
    for (let i = 0; i < 7; i++) {
      days.push(
        <div
          key={i}
          className="text-[9px] font-black uppercase text-token-accent-brand/40 text-center py-2"
        >
          {dateNames[i]}
        </div>,
      );
    }
    return <div className="grid grid-cols-7 mb-1">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows: React.ReactNode[] = [];
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    days.forEach((day) => {
      const isSelected = selectedDate && isSameDay(day, selectedDate);
      const isCurrentMonth = isSameMonth(day, monthStart);
      const isToday = isSameDay(day, new Date());

      // Check if disabled
      const isTooLate = maxDateObj ? day > maxDateObj : false;
      const isTooEarly = minDateObj ? day < minDateObj : false;
      const isDisabled = isTooLate || isTooEarly;

      rows.push(
        <Button
          variant="none"
          type="button"
          key={day.toString()}
          onClick={(e) => {
            e.stopPropagation();
            if (!isDisabled) {
              onChange(format(day, "yyyy-MM-dd"));
              setIsOpen(false);
            }
          }}
          disabled={isDisabled}
          className={`relative h-10 w-10 flex items-center justify-center rounded-md text-[11px] font-black transition-all shadow-none
                ${isDisabled ? "text-token-text-tertiary opacity-30 cursor-not-allowed" : !isCurrentMonth ? "text-token-text-tertiary" : "text-token-text-primary"}
                ${isSelected && !isDisabled ? "bg-token-accent-brand text-token-text-onAccent shadow-md scale-105 z-10" : !isDisabled ? "hover:bg-token-accent-brand/10 hover:text-token-accent-brand" : ""}
                ${isToday && !isSelected && !isDisabled ? "bg-token-accent-brand/5 text-token-accent-brand ring-1 ring-token-accent-brand/30" : ""}
              `}
        >
          {format(day, "d")}
        </Button>,
      );
    });

    return <div className="grid grid-cols-7 gap-1">{rows}</div>;
  };

  const displayValue =
    selectedDate && isValid(selectedDate)
      ? format(selectedDate, "dd 'de' MMMM, yyyy", { locale: es })
      : "";

  return (
    <div className={`w-full relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[10px] font-black uppercase tracking-widest text-token-text-secondary mb-2 ml-1">
          {label}
        </label>
      )}

      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-center h-11 px-4 rounded-md bg-token-surface-card border border-token-border-technical shadow-sm cursor-pointer transition-all hover:border-token-accent-brand hover:shadow-md
          ${isOpen ? "ring-1 ring-token-accent-brand border-token-accent-brand bg-token-surface-active" : ""}
        `}
      >
        <CalendarDaysIcon
          className={`w-4 h-4 mr-3 transition-colors ${value ? "text-token-accent-brand" : "text-token-text-tertiary group-hover:text-token-text-secondary transition-transform group-hover:scale-110"}`}
        />
        <span
          className={`flex-1 text-[11px] font-black uppercase tracking-tight truncate ${!value ? "text-token-text-tertiary" : "text-token-text-primary"}`}
        >
          {displayValue || placeholder}
        </span>
        {value && (
          <Button
            variant="none"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="p-1 rounded-full hover:bg-token-surface-hover transition-colors shadow-none"
          >
            <XCircleIcon className="w-4 h-4 text-token-text-tertiary opacity-0 group-hover:opacity-100" />
          </Button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute left-0 right-0 md:right-auto md:w-80 z-100 mt-2 rounded-md bg-token-surface-card border border-token-border-technical shadow-2xl overflow-hidden"
          >
            {renderHeader()}
            <div className="p-3">
              {renderDays()}
              {renderCells()}
            </div>
            <div className="py-3 px-4 bg-token-surface-header border-t border-token-border-technical flex justify-between items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentMonth(new Date());
                }}
                className="text-[9px] font-black uppercase tracking-tighter text-sap-blue hover:underline"
              >
                Ir a hoy
              </button>
              {value && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange("");
                    setIsOpen(false);
                  }}
                  className="text-[9px] font-black uppercase tracking-tighter text-red-500 hover:underline"
                >
                  Borrar
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default React.memo(GlassDatePicker);
