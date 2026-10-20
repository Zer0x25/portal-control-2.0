import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon } from "./icons/index";
import Button from "./Button";

/**
 * Unico date picker del design system (spec 031 T11 / AC7).
 *
 * - `DatePickerCalendar`: grilla componible y accesible (APG date picker):
 *   role="grid"/"row"/"gridcell", navegacion por flechas, Home/End,
 *   PageUp/PageDown y seleccion con Enter/Espacio. La semana empieza en
 *   lunes (`weekStartsOn: 1`).
 * - `DatePicker`: control componible (`value`/`onChange`) con disparador y
 *   panel emergente; es el reemplazo de GlassDatePicker.
 * - `DatePickerDialog`: modal que reutiliza `DatePickerCalendar`.
 */

const WEEK_START = 1; // lunes
const DAY_KEYS = ["LU", "MA", "MI", "JU", "VI", "SÁ", "DO"] as const;

export interface DatePickerCalendarProps {
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
  minDate?: Date | null;
  maxDate?: Date | null;
  /** Mes visible inicial (por defecto, el mes de la fecha seleccionada). */
  initialMonth?: Date;
  /** Mes visible controlado (la vista modal lo usa para el swipe). */
  month?: Date | null;
  /** Notifica cambios de mes (la vista modal lo usa para el swipe). */
  onMonthChange?: (month: Date) => void;
  className?: string;
  id?: string;
}

export const DatePickerCalendar: React.FC<DatePickerCalendarProps> = ({
  selectedDate,
  onSelect,
  minDate = null,
  maxDate = null,
  initialMonth,
  month = null,
  onMonthChange,
  className = "",
  id,
}) => {
  const [internalMonth, setInternalMonth] = useState<Date>(
    () => initialMonth ?? selectedDate ?? new Date(),
  );
  const [focusedDate, setFocusedDate] = useState<Date>(() => selectedDate ?? new Date());
  const gridRef = useRef<HTMLDivElement>(null);

  const isControlled = month !== null;
  const currentMonth = isControlled ? month : internalMonth;

  // Si la fecha seleccionada cambia desde fuera, el calendario la sigue.
  useEffect(() => {
    if (!selectedDate) return;
    setFocusedDate(selectedDate);
    setInternalMonth((prev) =>
      isSameMonth(prev, selectedDate) ? prev : startOfMonth(selectedDate),
    );
  }, [selectedDate]);

  const isDayDisabled = useCallback(
    (day: Date) => {
      if (minDate && day < minDate) return true;
      if (maxDate && day > maxDate) return true;
      return false;
    },
    [minDate, maxDate],
  );

  const changeMonth = useCallback(
    (next: Date) => {
      if (!isControlled) {
        setInternalMonth(next);
      }
      onMonthChange?.(next);
    },
    [isControlled, onMonthChange],
  );

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: WEEK_START });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: WEEK_START });
    const total = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
    return Array.from({ length: total }, (_, index) => addDays(start, index));
  }, [currentMonth]);

  const focusDay = useCallback((date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    const element = gridRef.current?.querySelector<HTMLElement>(`[data-date="${key}"]`);
    element?.focus();
  }, []);

  const moveFocus = useCallback(
    (next: Date) => {
      setFocusedDate(next);
      if (!isSameMonth(next, currentMonth)) {
        changeMonth(startOfMonth(next));
      }
      // El foco se aplica tras el render del nuevo mes.
      window.requestAnimationFrame(() => focusDay(next));
    },
    [changeMonth, currentMonth, focusDay],
  );

  const handleGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const day = focusedDate;
    let next: Date | undefined;

    switch (event.key) {
      case "ArrowLeft":
        next = subDays(day, 1);
        break;
      case "ArrowRight":
        next = addDays(day, 1);
        break;
      case "ArrowUp":
        next = subDays(day, 7);
        break;
      case "ArrowDown":
        next = addDays(day, 7);
        break;
      case "Home":
        next = startOfWeek(day, { weekStartsOn: WEEK_START });
        break;
      case "End":
        next = endOfWeek(day, { weekStartsOn: WEEK_START });
        break;
      case "PageUp":
        next = subMonths(day, 1);
        break;
      case "PageDown":
        next = addMonths(day, 1);
        break;
      default:
        return;
    }

    event.preventDefault();
    if (next && !isDayDisabled(next)) {
      moveFocus(next);
    }
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col">
          <span className="text-base font-black text-token-text-primary capitalize leading-tight">
            {format(currentMonth, "MMMM", { locale: es })}
          </span>
          <span className="text-[10px] font-black text-token-accent-brand tracking-widest">
            {format(currentMonth, "yyyy")}
          </span>
        </div>
        <div className="flex gap-1">
          <Button
            variant="none"
            type="button"
            onClick={() => changeMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-md hover:bg-token-surface-hover text-token-text-secondary hover:text-token-accent-brand transition-all active:scale-95 border border-transparent shadow-none"
            aria-label="Mes anterior"
            title="Mes anterior"
          >
            <ChevronLeftIcon className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="none"
            type="button"
            onClick={() => changeMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-md hover:bg-token-surface-hover text-token-text-secondary hover:text-token-accent-brand transition-all active:scale-95 border border-transparent shadow-none"
            aria-label="Mes siguiente"
            title="Mes siguiente"
          >
            <ChevronRightIcon className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="p-3">
        <div className="grid grid-cols-7 mb-1" role="row">
          {DAY_KEYS.map((label) => (
            <span
              key={label}
              role="columnheader"
              aria-label={label}
              className="text-center text-[8px] font-black text-token-text-tertiary py-1"
            >
              {label}
            </span>
          ))}
        </div>
        <div
          ref={gridRef}
          role="grid"
          id={id}
          aria-label="Calendario"
          onKeyDown={handleGridKeyDown}
          // El foco vive en las celdas (roving tabindex); la grilla queda
          // programaticamente enfocable para el patron APG de date picker.
          tabIndex={-1}
          className="grid grid-cols-7 gap-1"
        >
          {Array.from({ length: Math.ceil(days.length / 7) }, (_, rowIndex) => (
            <div key={`row-${rowIndex}`} role="row" className="contents">
              {days.slice(rowIndex * 7, rowIndex * 7 + 7).map((day) => {
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate !== null && isSameDay(day, selectedDate);
                const isFocused = isSameDay(day, focusedDate);
                const isDisabled = isDayDisabled(day);

                return (
                  <div key={day.toISOString()} role="gridcell" aria-selected={isSelected}>
                    <Button
                      variant="none"
                      type="button"
                      data-date={format(day, "yyyy-MM-dd")}
                      aria-label={format(day, "EEEE d 'de' MMMM 'de' yyyy", {
                        locale: es,
                      })}
                      aria-current={isToday(day) ? "date" : undefined}
                      tabIndex={isFocused ? 0 : -1}
                      onClick={() => {
                        if (isDisabled) return;
                        setFocusedDate(day);
                        onSelect(day);
                      }}
                      className={`
                          relative h-9 w-full flex items-center justify-center rounded-md text-[10px] font-black transition-all shadow-none
                          ${!isCurrentMonth ? "text-token-text-tertiary/40 opacity-30" : "text-token-text-primary"}
                          ${isToday(day) && !isSelected ? "text-token-accent-brand ring-1 ring-token-accent-brand/20 bg-token-accent-brand/5" : ""}
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
                    </Button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export interface DatePickerProps {
  /** Fecha seleccionada en formato YYYY-MM-DD. */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  id?: string;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  className?: string;
  "aria-describedby"?: string;
}

const parseBusinessDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

/**
 * Control componible de fecha: muestra la fecha formateada y abre la grilla
 * accesible en un panel emergente. Sustituye a GlassDatePicker.
 */
const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  id,
  placeholder = "Seleccionar fecha",
  minDate,
  maxDate,
  disabled = false,
  className = "",
  "aria-describedby": ariaDescribedBy,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedDate = useMemo(() => parseBusinessDate(value), [value]);
  const minDateObj = useMemo(() => parseBusinessDate(minDate), [minDate]);
  const maxDateObj = useMemo(() => parseBusinessDate(maxDate), [maxDate]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const displayValue = selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: es }) : "";

  const labelId = id ? `${id}-label` : undefined;
  const valueId = id ? `${id}-value` : undefined;

  return (
    <div ref={containerRef} className={`relative ${className}`.trim()}>
      {label && (
        <span
          id={labelId}
          className="block text-[10px] font-black uppercase tracking-widest text-token-text-tertiary mb-1"
        >
          {label}
        </span>
      )}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-labelledby={label ? labelId : undefined}
        aria-label={label ? undefined : placeholder}
        aria-describedby={[valueId, ariaDescribedBy].filter(Boolean).join(" ") || undefined}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 rounded-md border border-token-border-technical bg-token-surface-card px-3 py-2 text-left transition-colors hover:border-token-accent-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-token-accent-brand/40 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span
          className={
            displayValue
              ? "text-[11px] font-bold text-token-text-primary"
              : "text-[11px] font-bold text-token-text-tertiary"
          }
        >
          {displayValue || placeholder}
        </span>
        <CalendarDaysIcon className="w-4 h-4 shrink-0 text-token-text-tertiary" />
      </button>
      <span id={valueId} className="sr-only">
        {displayValue || "Sin fecha seleccionada"}
      </span>

      {isOpen && (
        <div
          role="dialog"
          aria-label={label ?? "Seleccionar fecha"}
          className="absolute z-50 mt-1 w-[320px] bg-token-surface-card border border-token-border-technical rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
        >
          <DatePickerCalendar
            selectedDate={selectedDate}
            onSelect={(date) => {
              onChange(format(date, "yyyy-MM-dd"));
              setIsOpen(false);
              triggerRef.current?.focus();
            }}
            minDate={minDateObj}
            maxDate={maxDateObj}
          />
        </div>
      )}
    </div>
  );
};

export default DatePicker;
