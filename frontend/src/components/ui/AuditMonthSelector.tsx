/**
 * 🛠️ Componente Finalizado: AuditMonthSelector
 * ⚠️ ATENCIÓN: No modificar este archivo a menos que sea pedido explícitamente por el USUARIO.
 * Este componente ha sido refinado, factorizado y pulido bajo estándares industriales específicos.
 */
import React, { useState, useRef, useEffect } from "react";
import {
  format,
  subMonths,
  addMonths,
  setMonth,
  setYear,
  eachMonthOfInterval,
  startOfYear,
  endOfYear,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons/index";
import { motion, AnimatePresence } from "framer-motion";
import { useBusinessNow } from "../../hooks/useBusinessNow";

interface AuditMonthSelectorProps {
  currentDate: Date;
  onChange: (date: Date) => void;
}

/**
 * 🗓️ Year Navigator Segment
 * Factored out for clean state management
 */
const YearPicker: React.FC<{
  currentDate: Date;
  today: Date;
  onChange: (date: Date) => void;
  onGoToToday: () => void;
}> = ({ currentDate, today, onChange, onGoToToday }) => {
  const currentYear = currentDate.getFullYear();
  const slidingYears = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center pr-1">
        <p className="text-[9px] font-bold uppercase tracking-widest text-sap-blue pl-1">Años</p>
        <button
          onClick={onGoToToday}
          className="text-[9px] font-bold uppercase tracking-widest text-token-text-tertiary hover:text-sap-blue transition-colors flex items-center gap-1 group/today"
        >
          <span className="opacity-0 group-hover/today:opacity-100 transition-opacity">&gt;</span>
          Actual
        </button>
      </div>
      <div className="flex items-center justify-center gap-1.5 py-1">
        {slidingYears.map((year) => {
          const isSelected = year === currentYear;
          const isDisabled = year > today.getFullYear();

          return (
            <button
              key={year}
              disabled={isDisabled}
              onClick={() => onChange(setYear(currentDate, year))}
              className={`
                px-5 py-1.5 rounded-sm text-[11px] font-bold transition-all border
                ${
                  isSelected
                    ? "bg-sap-blue text-white border-sap-blue shadow-sm"
                    : isDisabled
                      ? "opacity-10 cursor-not-allowed border-transparent text-token-text-tertiary"
                      : "bg-token-surface-stripe text-token-text-secondary border-token-border-subtle hover:border-sap-blue lg:hover:shadow-sm"
                }
              `}
            >
              {year}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * 📅 Month Grid Segment
 */
const MonthPicker: React.FC<{
  currentDate: Date;
  today: Date;
  onChange: (monthIdx: number) => void;
}> = ({ currentDate, today, onChange }) => {
  const months = eachMonthOfInterval({
    start: startOfYear(currentDate),
    end: endOfYear(currentDate),
  });

  const isFuture = (idx: number) => {
    const checkDate = setMonth(setYear(new Date(today), currentDate.getFullYear()), idx);
    return checkDate > today;
  };

  return (
    <div className="flex flex-col gap-3 pt-4 border-t border-token-border-subtle">
      <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 pl-1">
        Seleccionar Mes
      </p>
      <div className="grid grid-cols-4 gap-1.5">
        {months.map((m, idx) => {
          const isDisabled = isFuture(idx);
          const isSelected = currentDate.getMonth() === idx;

          return (
            <button
              key={idx}
              disabled={isDisabled}
              onClick={() => onChange(idx)}
              className={`px-2 py-2 rounded-sm text-[9px] font-bold capitalize tracking-wider transition-all border ${
                isSelected
                  ? "bg-indigo-700 text-white border-indigo-700 shadow-sm"
                  : isDisabled
                    ? "opacity-20 cursor-not-allowed bg-transparent border-transparent"
                    : "bg-token-surface-card text-token-text-secondary border-token-border-subtle hover:border-sap-blue"
              }`}
            >
              {format(m, "MMM", { locale: es })}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * 🏛️ Main Audit Month Selector
 * Final consolidated and refactored version
 */
const AuditMonthSelector: React.FC<AuditMonthSelectorProps> = ({ currentDate, onChange }) => {
  const today = useBusinessNow({ tickMs: null });
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Safety Guards
  const isCurrentMonth = format(currentDate, "MM yyyy") === format(today, "MM yyyy");
  const handleMonthShift = (delta: number) => {
    const nextDate = delta > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1);
    if (delta < 0 || nextDate <= today) onChange(nextDate);
  };

  // Click Outside Logic
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative w-fit" ref={containerRef}>
      {/* 🧩 Header Control Bar */}
      <div className="flex items-center gap-1.5 bg-token-surface-card p-1 rounded-sm border border-token-border-subtle group transition-colors shadow-sm">
        <button
          onClick={() => handleMonthShift(-1)}
          className="p-2 rounded-sm hover:bg-token-surface-active transition-all active:scale-95 border border-transparent hover:border-token-border-subtle text-token-text-tertiary"
          title="Anterior"
        >
          <ChevronLeftIcon className="w-3.5 h-3.5" />
        </button>

        <div
          onClick={() => setIsOpen(!isOpen)}
          className="flex flex-col items-center justify-center px-4 border-x border-token-border-subtle min-w-[160px] text-center cursor-pointer hover:bg-token-surface-active transition-colors group/text py-1 rounded-sm"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-token-text-tertiary leading-none mb-1.5 opacity-80 group-hover/text:text-sap-blue">
            Periodo de Consulta
          </p>
          <p className="text-[13px] font-bold capitalize tracking-tight text-token-text-primary leading-none whitespace-nowrap flex items-center gap-2">
            {format(currentDate, "MMMM yyyy", { locale: es })}
            <ChevronLeftIcon
              className={`w-3 h-3 text-token-text-tertiary transition-transform duration-150 ${isOpen ? "rotate-90" : "-rotate-90"}`}
            />
          </p>
        </div>

        <button
          onClick={() => handleMonthShift(1)}
          disabled={isCurrentMonth}
          className="p-2 rounded-sm transition-all border border-transparent text-token-text-tertiary disabled:opacity-20 disabled:cursor-not-allowed enabled:hover:bg-token-surface-active enabled:hover:border-token-border-subtle enabled:active:scale-95"
          title="Siguiente"
        >
          <ChevronRightIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 🚀 Floating Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, x: "-50%" }}
            animate={{ opacity: 1, y: 4, x: "-50%" }}
            exit={{ opacity: 0, y: 10, x: "-50%" }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-1/2 top-full z-100 w-[300px] bg-token-surface-card border border-token-border-technical shadow-2xl rounded-sm p-6 overflow-hidden"
            style={{ transformOrigin: "top center" }}
          >
            <div className="space-y-6">
              <YearPicker
                currentDate={currentDate}
                today={today}
                onChange={onChange}
                onGoToToday={() => {
                  onChange(today);
                  setIsOpen(false);
                }}
              />
              <MonthPicker
                currentDate={currentDate}
                today={today}
                onChange={(idx) => {
                  onChange(setMonth(currentDate, idx));
                  setIsOpen(false);
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default React.memo(AuditMonthSelector);
