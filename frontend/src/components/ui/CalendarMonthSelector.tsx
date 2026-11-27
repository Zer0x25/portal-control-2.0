/**
 * 🛠️ Componente Finalizado: CalendarMonthSelector
 * ⚠️ Adaptación de AuditMonthSelector para el Calendario de Turnos.
 * Mantiene la estética Industrial-Elegante y añade soporte para navegación por días/semanas.
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
import { useBusinessNow } from "../../hooks/useBusinessNow";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons/index";
import { Z } from "../../constants/zScale";

interface CalendarMonthSelectorProps {
  currentDate: Date;
  onChange: (date: Date) => void;
  isLoading?: boolean;
  label?: string;
  viewMode?: "month" | "week" | "day";
  onPrev?: () => void;
  onNext?: () => void;
}

const PANEL_WIDTH = 280;
const VIEWPORT_MARGIN = 8;

/**
 * 🗓️ Year Navigator Segment
 * Segmento de años deslizantes. Al elegir un año el panel permanece abierto
 * para poder encadenar la selección del mes sin volver a abrir el desplegable.
 */
const YearPicker: React.FC<{
  currentDate: Date;
  onChange: (date: Date) => void;
}> = ({ currentDate, onChange }) => {
  const currentYear = currentDate.getFullYear();
  const slidingYears = [currentYear - 1, currentYear, currentYear + 1];
  const canGoOlder = currentYear - 1 > 1900;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xxs font-bold uppercase tracking-widest text-token-accent-brand pl-1">
        Años
      </p>
      <div className="flex items-center justify-center gap-1.5 py-1">
        <button
          disabled={!canGoOlder}
          onClick={() => onChange(setYear(currentDate, currentYear - 1))}
          className="p-1 rounded-sm text-token-text-tertiary disabled:opacity-20 disabled:cursor-not-allowed enabled:hover:text-token-accent-brand transition-colors"
          title="Año anterior"
        >
          <ChevronLeftIcon className="w-3 h-3" />
        </button>
        {slidingYears.map((year) => {
          const isSelected = year === currentYear;

          return (
            <button
              key={year}
              onClick={() => onChange(setYear(currentDate, year))}
              className={`
                px-5 py-1.5 rounded-sm text-[11px] font-bold transition-all border
                ${
                  isSelected
                    ? "bg-token-accent-brand text-white border-token-accent-brand shadow-sm"
                    : "bg-token-surface-stripe text-token-text-secondary border-token-border-subtle hover:border-token-accent-brand lg:hover:shadow-sm"
                }
              `}
            >
              {year}
            </button>
          );
        })}
        <button
          onClick={() => onChange(setYear(currentDate, currentYear + 1))}
          className="p-1 rounded-sm text-token-text-tertiary hover:text-token-accent-brand transition-colors"
          title="Año siguiente"
        >
          <ChevronRightIcon className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

/**
 * 📅 Month Grid Segment
 * Al elegir un mes el panel permanece abierto: así se puede navegar mes a mes
 * (o cambiar el año) sin volver a abrir el desplegable.
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

  // Solo el año en curso tiene meses futuros bloqueados; los años pasados
  // deben permitir navegar todos sus meses.
  const isFuture = (idx: number) =>
    currentDate.getFullYear() === today.getFullYear() && setMonth(new Date(today), idx) > today;

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
 * 🏛️ Calendar Month Selector Component
 */
const CalendarMonthSelector: React.FC<CalendarMonthSelectorProps> = ({
  currentDate,
  onChange,
  isLoading: _isLoading = false,
  label = "PERIODO DE CONSULTA",
  onPrev,
  onNext,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ left: 0, top: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const today = useBusinessNow({ tickMs: null });

  const closeAndRestoreFocus = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  // Navigation Logic
  const handlePrev = () => (onPrev ? onPrev() : onChange(subMonths(currentDate, 1)));
  const handleNext = () => (onNext ? onNext() : onChange(addMonths(currentDate, 1)));

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
      {/* Control Bar: el titulo va fuera de la capsula, como los labels de FilterSelect */}
      <div className="flex flex-col min-w-[160px]">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-token-text-secondary mb-2 ml-1">
          {label}
        </p>
        <div className="flex items-center gap-1.5 bg-token-surface-card p-1 rounded-sm border border-token-border-subtle group transition-colors shadow-sm">
          <button
            onClick={handlePrev}
            aria-label="Mes anterior"
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
            className="flex-1 flex items-center justify-between gap-2 px-2 text-center cursor-pointer rounded-sm hover:text-token-accent-brand transition-colors"
          >
            <span className="text-[13px] font-bold capitalize tracking-tight text-token-text-primary leading-none whitespace-nowrap">
              {format(currentDate, "MMMM yyyy", { locale: es })}
            </span>
            <ChevronLeftIcon
              className={`w-3.5 h-3.5 text-token-text-tertiary transition-transform duration-150 ${isOpen ? "rotate-90" : "-rotate-90"}`}
            />
          </button>

          <button
            onClick={handleNext}
            aria-label="Mes siguiente"
            className="p-2 rounded-sm hover:bg-token-surface-active transition-all active:scale-95 border border-transparent hover:border-token-border-subtle text-token-text-tertiary"
            title="Siguiente"
          >
            <ChevronRightIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Dropdown Panel: portal al body para no ser recortado por tarjetas */}
      {isOpen &&
        createPortal(
          <div
            id={panelId}
            ref={panelRef}
            style={{ left: panelPosition.left, top: panelPosition.top }}
            className={`fixed ${Z.modal} w-[280px] bg-token-surface-card border border-token-border-technical shadow-2xl rounded-md p-6 overflow-hidden animate-in fade-in slide-in-from-top-2`}
          >
            <div className="space-y-6">
              <YearPicker currentDate={currentDate} onChange={onChange} />
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

export default CalendarMonthSelector;
