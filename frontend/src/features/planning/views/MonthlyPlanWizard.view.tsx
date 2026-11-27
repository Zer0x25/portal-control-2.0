import React from "react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Badge from "../../../components/ui/Badge";
import EmptyState from "../../../components/ui/EmptyState";
import FilterSelect from "../../../components/ui/FilterSelect";
import { CalendarDaysIcon, SparklesIcon } from "../../../components/ui/icons";
import type { Employee } from "../../../types";
import {
  MONTH_OPTIONS,
  computeShiftHours,
  type EditableDayRow,
} from "../hooks/useMonthlyPlanWizard";

export interface MonthlyPlanWizardViewProps {
  sortedEmployees: Employee[];
  isLoadingEmployees: boolean;
  yearOptions: number[];
  selectedEmployeeId: string;
  onSelectEmployee: (employeeId: string) => void;
  selectedYear: number;
  onSelectYear: (year: number) => void;
  selectedMonth: number;
  onSelectMonth: (month: number) => void;
  patternName: string;
  onPatternNameChange: (name: string) => void;
  defaultStartTime: string;
  onDefaultStartTimeChange: (value: string) => void;
  defaultEndTime: string;
  onDefaultEndTimeChange: (value: string) => void;
  rows: EditableDayRow[];
  isSuggestingName: boolean;
  isSaving: boolean;
  isLoadingPlan: boolean;
  isPlanError: boolean;
  planErrorMessage: string;
  totalWorkDays: number;
  totalPlannedHours: number;
  onSuggestName: () => void;
  onToggleDayType: (day: number) => void;
  onTimeChange: (day: number, field: "startTime" | "endTime", value: string) => void;
  onApplyWeekdays: () => void;
  onClearAllRest: () => void;
  onSaveMonthlyPlan: () => void;
}

export const MonthlyPlanWizardView: React.FC<MonthlyPlanWizardViewProps> = ({
  sortedEmployees,
  isLoadingEmployees,
  yearOptions,
  selectedEmployeeId,
  onSelectEmployee,
  selectedYear,
  onSelectYear,
  selectedMonth,
  onSelectMonth,
  patternName,
  onPatternNameChange,
  defaultStartTime,
  onDefaultStartTimeChange,
  defaultEndTime,
  onDefaultEndTimeChange,
  rows,
  isSuggestingName,
  isSaving,
  isLoadingPlan,
  isPlanError,
  planErrorMessage,
  totalWorkDays,
  totalPlannedHours,
  onSuggestName,
  onToggleDayType,
  onTimeChange,
  onApplyWeekdays,
  onClearAllRest,
  onSaveMonthlyPlan,
}) => {
  return (
    <div className="space-y-6">
      <Card
        title="Configuración del Plan Mensual"
        badge={
          selectedEmployeeId ? (
            <Badge variant="info" fontMono>
              {totalWorkDays} días / {totalPlannedHours.toFixed(1)} hrs
            </Badge>
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FilterSelect
            id="monthly-plan-employee"
            label="Colaborador"
            value={selectedEmployeeId}
            onChange={(e) => onSelectEmployee(e.target.value)}
            disabled={isLoadingEmployees}
            options={[
              { value: "", label: "Seleccionar colaborador..." },
              ...sortedEmployees.map((emp) => ({ value: emp.id, label: emp.name })),
            ]}
          />

          <FilterSelect
            id="monthly-plan-month"
            label="Mes"
            value={String(selectedMonth)}
            onChange={(e) => onSelectMonth(Number(e.target.value))}
            options={MONTH_OPTIONS.map((m) => ({ value: String(m.value), label: m.label }))}
          />

          <FilterSelect
            id="monthly-plan-year"
            label="Año"
            value={String(selectedYear)}
            onChange={(e) => onSelectYear(Number(e.target.value))}
            options={yearOptions.map((year) => ({ value: String(year), label: String(year) }))}
          />

          <div className="space-y-2">
            <Input
              id="monthly-plan-pattern-name"
              label="Nombre del Patrón"
              value={patternName}
              onChange={(e) => onPatternNameChange(e.target.value)}
              placeholder="Ej: Plan Mensual Dic 2026"
              className="h-11 py-2!"
            />
            {selectedEmployeeId && (
              <Button
                variant="secondary"
                size="xs"
                onClick={onSuggestName}
                loading={isSuggestingName}
                className="w-full"
              >
                <SparklesIcon className="w-3.5 h-3.5 mr-1.5" />
                Sugerir nombre
              </Button>
            )}
          </div>
        </div>
      </Card>

      {!selectedEmployeeId ? (
        <Card>
          <EmptyState
            icon={<CalendarDaysIcon className="w-8 h-8 text-token-accent-brand" />}
            title="Seleccione un colaborador"
            description="Elija un colaborador, mes y año para cargar su malla actual y configurar la planificación mensual."
          />
        </Card>
      ) : isLoadingPlan ? (
        <Card>
          <div className="py-12 text-center text-xs font-bold uppercase tracking-widest text-token-text-secondary">
            Cargando planificación del mes...
          </div>
        </Card>
      ) : isPlanError ? (
        <Card>
          <EmptyState
            icon={<CalendarDaysIcon className="w-8 h-8 text-token-status-error" />}
            title="No se pudo cargar el plan mensual"
            description={planErrorMessage}
          />
        </Card>
      ) : (
        <Card
          title="Distribución Diaria del Mes"
          badge={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="xs" onClick={onApplyWeekdays}>
                Lun–Vie Trabajo
              </Button>
              <Button variant="secondary" size="xs" onClick={onClearAllRest}>
                Todo Descanso
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={isSaving}
                disabled={isSaving || rows.length === 0}
                onClick={onSaveMonthlyPlan}
              >
                Guardar Plan Mensual
              </Button>
            </div>
          }
        >
          <div className="flex flex-wrap items-end gap-4 mb-4 p-3 bg-token-surface-stripe border border-token-border-subtle rounded-md">
            <div className="w-36">
              <Input
                id="monthly-plan-default-start"
                label="Entrada Base"
                type="time"
                value={defaultStartTime}
                onChange={(e) => onDefaultStartTimeChange(e.target.value)}
                className="py-2!"
              />
            </div>
            <div className="w-36">
              <Input
                id="monthly-plan-default-end"
                label="Salida Base"
                type="time"
                value={defaultEndTime}
                onChange={(e) => onDefaultEndTimeChange(e.target.value)}
                className="py-2!"
              />
            </div>
          </div>

          <div
            role="region"
            aria-label="Grilla de días de planificación mensual"
            className="max-h-[480px] overflow-y-auto focus:outline-hidden border border-token-border-subtle rounded-md divide-y divide-token-border-subtle"
          >
            {rows.map((row) => {
              const hours = row.type === "work" ? computeShiftHours(row.startTime, row.endTime) : 0;
              return (
                <div
                  key={row.dateIso}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-token-surface-card hover:bg-token-surface-hover"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="typo-list-value w-8 text-center text-token-text-primary">
                      {String(row.day).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <div className="typo-list-primary uppercase">{row.dayOfWeek}</div>
                      <div className="typo-list-secondary text-token-text-tertiary">
                        {row.dateIso} · Actual: {row.currentScheduleText}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant={row.type === "work" ? "success" : "secondary"}
                      size="xs"
                      onClick={() => onToggleDayType(row.day)}
                      aria-label={`Cambiar estado día ${row.day}`}
                    >
                      {row.type === "work" ? "Trabajo" : "Descanso"}
                    </Button>

                    {row.type === "work" && (
                      <>
                        <label htmlFor={`start-${row.day}`} className="sr-only">
                          Hora entrada día {row.day}
                        </label>
                        <input
                          id={`start-${row.day}`}
                          type="time"
                          value={row.startTime}
                          onChange={(e) => onTimeChange(row.day, "startTime", e.target.value)}
                          className="h-9 px-2 bg-token-surface-card border border-token-border-technical rounded-sm text-xs font-mono text-token-text-primary"
                        />
                        <span className="text-xs text-token-text-tertiary">-</span>
                        <label htmlFor={`end-${row.day}`} className="sr-only">
                          Hora salida día {row.day}
                        </label>
                        <input
                          id={`end-${row.day}`}
                          type="time"
                          value={row.endTime}
                          onChange={(e) => onTimeChange(row.day, "endTime", e.target.value)}
                          className="h-9 px-2 bg-token-surface-card border border-token-border-technical rounded-sm text-xs font-mono text-token-text-primary"
                        />
                        <Badge variant="neutral" size="sm" fontMono>
                          {hours.toFixed(1)}h
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};
