/**
 * 🛠️ Componente Finalizado: AuditMonthSelector
 * ⚠️ ATENCIÓN: No modificar este archivo a menos que sea pedido explícitamente por el USUARIO.
 * Este componente ha sido refinado, factorizado y pulido bajo estándares industriales específicos.
 */
import React, { useState, useRef, useEffect, useId } from "react";
import { createPortal } from "react-dom";
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
import { useBusinessNow } from "../../hooks/useBusinessNow";
import { Z } from "../../constants/zScale";

interface AuditMonthSelectorProps {
  currentDate: Date;
  onChange: (date: Date) => void;
}

const PANEL_WIDTH = 300;
const VIEWPORT_MARGIN = 8;

/**
 * 🗓️ Year Navigator Segment
 * Al elegir un año el panel permanece abierto: así se encadena la selección
 * del mes sin volver a abrir el desplegable.
 */
const YearPicker: React.FC<{
  currentDate: Date;
  today: Date;
  onChange: (date: Date) => void;
}> = ({ currentDate, today, onChange }) => {
  const currentYear = currentDate.getFullYear();
  const slidingYears = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xxs font-bold uppercase tracking-widest text-token-accent-brand pl-1">
        Años
      </p>
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
                    ? "bg-token-accent-brand text-white border-token-accent-brand shadow-sm"
                    : isDisabled
                      ? "opacity-10 cursor-not-allowed border-transparent text-token-text-tertiary"
                      : "bg-token-surface-stripe text-token-text-secondary border-token-border-subtle hover:border-token-accent-brand lg:hover:shadow-sm"
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
  onGoToToday: () => void;
}> = ({ currentDate, today, onChange, onGoToToday }) => {
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
      <div className="flex justify-between items-center pr-1">
        <p className="text-xxs font-bold uppercase tracking-widest text-token-status-success-text pl-1">
          Seleccionar Mes
        </p>
        <button
          onClick={onGoToToday}
          className="text-xxs font-bold uppercase tracking-widest text-token-text-tertiary hover:text-token-accent-brand transition-colors flex items-center gap-1 group/today"
        >
          <span className="opacity-0 group-hover/today:opacity-100 transition-opacity">&gt;</span>
          Actual
        </button>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {months.map((m, idx) => {
          const isDisabled = isFuture(idx);
          const isSelected = currentDate.getMonth() === idx;

          return (
            <button
              key={idx}
              disabled={isDisabled}
              onClick={() => onChange(idx)}
              className={`px-2 py-2 rounded-sm text-xxs font-bold capitalize tracking-wider transition-all border ${
                isSelected
                  ? "bg-token-accent-brand text-token-text-onAccent border-token-accent-brand shadow-sm"
                  : isDisabled
                    ? "opacity-20 cursor-not-allowed bg-transparent border-transparent"
                    : "bg-token-surface-card text-token-text-secondary border-token-border-subtle hover:border-token-accent-brand"
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
  const [panelPosition, setPanelPosition] = useState({ left: 0, top: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const closeAndRestoreFocus = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  // Safety Guards
  const isCurrentMonth = format(currentDate, "MM yyyy") === format(today, "MM yyyy");
  const handleMonthShift = (delta: number) => {
    const nextDate = delta > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1);
    if (delta < 0 || nextDate <= today) onChange(nextDate);
  };

  // Click Outside Logic (el panel vive en un portal, fuera del contenedor)
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // El panel se ancla al disparador en coordenadas de viewport: asi escapa de
  // contenedores con `overflow-hidden` o `transform` que lo recortaban.
  useEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const maxLeft = window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN;
      setPanelPosition({
        left: Math.min(Math.max(center - PANEL_WIDTH / 2, VIEWPORT_MARGIN), maxLeft),
        top: rect.bottom + 6,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  return (
    <div
      className="relative w-fit"
      ref={containerRef}
      onKeyDown={(event) => {
        if (event.key === "Escape" && isOpen) {
          event.stopPropagation();
          closeAndRestoreFocus();
        }
      }}
    >
      {/* 🧩 Header Control Bar */}
      <div className="flex items-center gap-1.5 bg-token-surface-card p-1 rounded-sm border border-token-border-subtle group transition-colors shadow-sm">
        <button
          onClick={() => handleMonthShift(-1)}
          className="p-2 rounded-sm hover:bg-token-surface-active transition-all active:scale-95 border border-transparent hover:border-token-border-subtle text-token-text-tertiary"
          title="Anterior"
        >
          <ChevronLeftIcon className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          ref={triggerRef}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls={isOpen ? panelId : undefined}
          className="flex flex-col items-center justify-center px-4 border-x border-token-border-subtle min-w-[160px] text-center cursor-pointer hover:bg-token-surface-active transition-colors group/text py-1 rounded-sm"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-token-text-tertiary leading-none mb-1.5 group-hover/text:text-token-accent-brand">
            Periodo de Consulta
          </p>
          <p className="text-[13px] font-bold capitalize tracking-tight text-token-text-primary leading-none whitespace-nowrap flex items-center gap-2">
            {format(currentDate, "MMMM yyyy", { locale: es })}
            <ChevronLeftIcon
              className={`w-3 h-3 text-token-text-tertiary transition-transform duration-150 ${isOpen ? "rotate-90" : "-rotate-90"}`}
            />
          </p>
        </button>

        <button
          onClick={() => handleMonthShift(1)}
          disabled={isCurrentMonth}
          className="p-2 rounded-sm transition-all border border-transparent text-token-text-tertiary disabled:opacity-20 disabled:cursor-not-allowed enabled:hover:bg-token-surface-active enabled:hover:border-token-border-subtle enabled:active:scale-95"
          title="Siguiente"
        >
          <ChevronRightIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Panel: portal al body para no ser recortado por tarjetas */}
      {isOpen &&
        createPortal(
          <div
            id={panelId}
            ref={panelRef}
            style={{ left: panelPosition.left, top: panelPosition.top }}
            className={`fixed ${Z.modal} w-[300px] bg-token-surface-card border border-token-border-technical shadow-2xl rounded-sm p-6 overflow-hidden animate-in fade-in slide-in-from-top-2`}
          >
            <div className="space-y-6">
              <YearPicker currentDate={currentDate} today={today} onChange={onChange} />
              <MonthPicker
                currentDate={currentDate}
                today={today}
                onChange={(idx) => onChange(setMonth(currentDate, idx))}
                onGoToToday={() => onChange(today)}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default AuditMonthSelector;
