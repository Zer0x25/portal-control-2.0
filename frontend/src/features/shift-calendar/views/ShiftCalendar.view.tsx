import React from "react";
import { ScheduledEmployeeDetail } from "../../../types/index";
import ShiftCalendarView from "../../../components/ui/ShiftCalendarView";
import {
  CalendarDaysIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
} from "../../../components/ui/icons/index";
import { formatDateUTCISO } from "../../../utils/dateUtils";
import { ScheduleMap } from "../../../hooks/useCalendarData";
import PageHeader from "../../../components/ui/PageHeader";
import CalendarMonthSelector from "../../../components/ui/CalendarMonthSelector";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";

type ShiftCalendarEmployeeOption = {
  id: string;
  name: string;
};

type ShiftCalendarViewMode = "month" | "week" | "day";

export interface ShiftCalendarViewProps {
  isWorker: boolean;
  isLoadingEmployees: boolean;
  displayDate: Date;
  viewMode: ShiftCalendarViewMode;
  selectedArea: string;
  selectedCargo: string;
  selectedEmployeeId: string | null;
  isDownloading: boolean;
  isPrinting: boolean;
  filteredEmployeesForCalendar: ShiftCalendarEmployeeOption[];
  isAssignedShiftsLoading: boolean;
  isShiftPatternsLoading: boolean;
  scheduleMap: ScheduleMap;
  isLoadingCalendar: boolean;
  uniqueAreas: string[];
  uniqueCargosInArea: string[];
  setDisplayDate: React.Dispatch<React.SetStateAction<Date>>;
  setViewMode: React.Dispatch<React.SetStateAction<ShiftCalendarViewMode>>;
  setSelectedEmployeeId: React.Dispatch<React.SetStateAction<string | null>>;
  handlePrev: () => void;
  handleNext: () => void;
  handleAreaChange: React.ChangeEventHandler<HTMLSelectElement>;
  handleCargoChange: React.ChangeEventHandler<HTMLSelectElement>;
  handleDayDoubleClick: (date: Date) => void;
  handleExportToPDF: () => Promise<void>;
  handleDownloadBackendPDF: () => Promise<void>;
  handleExportToICS: () => void;
}

/* UI-PROTECTED: EDIT ONLY WITH HUMAN APPROVAL
   Presentational layer for Shift Calendar.
*/
export const ShiftCalendarFeatureView: React.FC<ShiftCalendarViewProps> = (props) => {
  const {
    isWorker,
    isLoadingEmployees,
    displayDate,
    viewMode,
    selectedArea,
    selectedCargo,
    selectedEmployeeId,
    isDownloading,
    isPrinting,
    filteredEmployeesForCalendar,
    isAssignedShiftsLoading,
    isShiftPatternsLoading,
    scheduleMap,
    isLoadingCalendar,
    uniqueAreas,
    uniqueCargosInArea,
    setDisplayDate,
    setViewMode,
    setSelectedEmployeeId,
    handlePrev,
    handleNext,
    handleAreaChange,
    handleCargoChange,
    handleDayDoubleClick,
    handleExportToPDF,
    handleDownloadBackendPDF,
    handleExportToICS,
  } = props;

  const DayView: React.FC<{
    displayDate: Date;
    selectedEmployeeId: string | null;
    scheduleMap: ScheduleMap;
    onNavigateToEmployeeMonth: (employeeId: string) => void;
  }> = ({
    displayDate: date,
    selectedEmployeeId: selectedId,
    scheduleMap: map,
    onNavigateToEmployeeMonth,
  }) => {
    const dayData = map.get(formatDateUTCISO(date));

    if (selectedId) {
      const scheduleInfo = dayData?.type === "employee" ? dayData.data : undefined;
      if (!scheduleInfo)
        return (
          <div className="p-10 text-center text-token-text-tertiary uppercase text-[11px] font-bold tracking-widest">
            Sin registros de turno
          </div>
        );

      return (
        <div className="p-8">
          <h4 className="text-xl font-bold text-center mb-6 text-token-text-primary uppercase tracking-tight">
            {scheduleInfo.scheduleText}
          </h4>
          {scheduleInfo.isWorkDay ? (
            <div className="text-center p-6 bg-token-surface-stripe border border-token-border-technical rounded-sm">
              <p
                className="text-4xl font-black tracking-tighter"
                style={{ color: scheduleInfo.patternColor || "var(--sidebar-text-active)" }}
              >
                {scheduleInfo.startTime} - {scheduleInfo.endTime}
              </p>
              <p className="text-sm font-bold text-token-text-secondary mt-2 opacity-70">
                ({scheduleInfo.hours?.toFixed(2)} hrs)
              </p>
              <p className="mt-4 text-[11px] font-bold text-token-text-tertiary uppercase tracking-[0.2em]">
                Patrón:{" "}
                <span className="text-token-text-primary">{scheduleInfo.shiftPatternName}</span>
              </p>
            </div>
          ) : (
            <div className="py-12 text-center text-token-text-tertiary uppercase text-[11px] font-bold tracking-widest border border-dashed border-token-border-subtle rounded-sm">
              Jornada de descanso programada
            </div>
          )}
        </div>
      );
    }

    if (dayData?.type === "holiday") {
      const holiday = dayData.data;
      return (
        <div className="p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-(--status-warning)/10 rounded-full flex items-center justify-center mb-6">
            <CalendarDaysIcon className="w-8 h-8 text-(--status-warning)" />
          </div>
          <h4 className="text-2xl font-black text-token-text-primary uppercase tracking-tighter">
            {holiday.name}
          </h4>
          <p className="text-[11px] font-bold text-(--status-warning) mt-2 uppercase tracking-widest">
            Feriado {holiday.type}
          </p>
        </div>
      );
    }

    const scheduledEmployees: ScheduledEmployeeDetail[] =
      dayData?.type === "group" && Array.isArray(dayData.data)
        ? [...dayData.data].sort((a, b) =>
            (a.startTime || "23:59").localeCompare(b.startTime || "23:59"),
          )
        : [];

    if (scheduledEmployees.length === 0) {
      return (
        <div className="py-20 text-center text-token-text-tertiary uppercase text-[11px] font-bold tracking-widest">
          Sin dotación programada
        </div>
      );
    }

    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6 border-b border-token-border-technical pb-4">
          <h3 className="text-sm font-bold text-token-text-primary uppercase tracking-widest">
            Dotación del Día
          </h3>
          <span className="px-2.5 py-1 bg-token-surface-stripe border border-token-border-technical rounded-sm text-[10px] font-bold text-token-text-secondary">
            {scheduledEmployees.length} OPERADORES
          </span>
        </div>

        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-token-border-technical scrollbar-track-transparent">
            {scheduledEmployees.map((emp) => (
              <div
                key={emp.employeeId}
                onClick={() => onNavigateToEmployeeMonth(emp.employeeId)}
                className="p-5 bg-token-surface-card border border-token-border-technical rounded-sm hover:border-(--sidebar-text-active) hover:shadow-lg hover:shadow-(--sidebar-text-active)/5 transition-all group cursor-pointer select-none"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[12px] font-black text-token-text-primary uppercase truncate pr-2 group-hover:text-(--sidebar-text-active) transition-colors">
                    {emp.employeeName}
                  </span>
                  <span className="text-[11px] font-bold text-token-text-secondary bg-token-surface-stripe px-2 py-0.5 rounded-sm font-mono">
                    {emp.startTime} - {emp.endTime}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-6">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full shadow-sm"
                      style={{ backgroundColor: emp.patternColor || "var(--token-border-subtle)" }}
                    />
                    <span className="text-[10px] font-bold text-token-text-tertiary uppercase tracking-widest">
                      {emp.shiftPatternName}
                    </span>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] font-black text-(--sidebar-text-active) uppercase tracking-[0.2em]">
                      Ver Mes →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (isShiftPatternsLoading || isAssignedShiftsLoading || isLoadingEmployees) {
    return (
      <div
        className="py-20 text-center text-(--sidebar-text-active) font-bold uppercase tracking-widest animate-pulse"
        data-ui-protected
      >
        Sincronizando malla de turnos...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500" data-ui-protected>
      <PageHeader
        eyebrow="Planificación"
        eyebrowIcon={<CalendarDaysIcon className="w-3.5 h-3.5" />}
        icon={<CalendarDaysIcon className="w-4 h-4" />}
        title={isWorker ? "Mi Calendario" : "Calendario de Turnos"}
        subtitle="Malla operativa y gestión de dotación"
      />

      <Card variant="premium" noPadding className="border-token-border-technical overflow-visible">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6 mb-8 bg-token-surface-stripe p-4 border border-token-border-technical rounded-sm">
            <div className="flex p-1 bg-token-surface-card border border-token-border-technical rounded-sm shadow-sm shrink-0">
              {(["month", "week", "day"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-1.5 rounded-sm text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${
                    viewMode === mode
                      ? "bg-(--sidebar-text-active) text-white shadow-sm"
                      : "text-token-text-tertiary hover:text-token-text-primary hover:bg-token-surface-active"
                  }`}
                >
                  {mode === "month" ? "Mes" : mode === "week" ? "Semana" : "Día"}
                </button>
              ))}
            </div>

            <CalendarMonthSelector
              currentDate={displayDate}
              onChange={setDisplayDate}
              isLoading={isLoadingCalendar}
              viewMode={viewMode}
              onPrev={handlePrev}
              onNext={handleNext}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end bg-token-surface-stripe/40 p-3 rounded-lg">
            {!isWorker && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-token-text-tertiary uppercase tracking-widest pl-1">
                    Área Operativa
                  </label>
                  <select
                    value={selectedArea}
                    onChange={handleAreaChange}
                    className="w-full h-11 px-4 bg-token-surface-card border border-token-border-technical rounded-sm text-[12px] font-bold uppercase tracking-tight focus:ring-2 focus:ring-(--sidebar-text-active)/20 text-token-text-primary outline-none"
                  >
                    <option value="">TODAS LAS ÁREAS</option>
                    {uniqueAreas.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-token-text-tertiary uppercase tracking-widest pl-1">
                    Cargo Técnico
                  </label>
                  <select
                    value={selectedCargo}
                    onChange={handleCargoChange}
                    className="w-full h-11 px-4 bg-token-surface-card border border-token-border-technical rounded-sm text-[12px] font-bold uppercase tracking-tight focus:ring-2 focus:ring-(--sidebar-text-active)/20 text-token-text-primary outline-none"
                  >
                    <option value="">TODOS LOS CARGOS</option>
                    {uniqueCargosInArea.map((cargo) => (
                      <option key={cargo} value={cargo}>
                        {cargo}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-token-text-tertiary uppercase tracking-widest pl-1">
                    Colaborador
                  </label>
                  <select
                    value={selectedEmployeeId || "ALL"}
                    onChange={(e) =>
                      setSelectedEmployeeId(e.target.value === "ALL" ? null : e.target.value)
                    }
                    className="w-full h-11 px-4 bg-token-surface-card border border-token-border-technical rounded-sm text-[12px] font-bold uppercase tracking-tight focus:ring-2 focus:ring-(--sidebar-text-active)/20 text-token-text-primary outline-none"
                  >
                    <option value="ALL">DOTACIÓN COMPLETA</option>
                    {filteredEmployeesForCalendar.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-token-text-tertiary uppercase tracking-widest pl-1">
                Acciones / Exportar
              </label>
              <div className="flex flex-auto gap-2 w-full">
                <Button
                  variant="secondary"
                  onClick={handleExportToICS}
                  disabled={!selectedEmployeeId || isPrinting || isDownloading}
                  className="flex flex-auto h-11 bg-token-surface-card border-token-border-technical hover:bg-token-surface-active rounded-sm"
                >
                  <CalendarDaysIcon className="w-4 h-4 mr-2 text-(--sidebar-text-active)" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-token-text-primary">
                    ICS
                  </span>
                </Button>

                <Button
                  variant="secondary"
                  onClick={handleExportToPDF}
                  disabled={!selectedEmployeeId || isPrinting || isDownloading}
                  className="flex flex-auto h-11 bg-token-surface-card border-token-border-technical hover:bg-token-surface-active rounded-sm"
                >
                  <PrinterIcon
                    className={`w-4 h-4 mr-2 text-(--sidebar-text-active) shrink-0 ${isPrinting ? "animate-spin" : ""}`}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-token-text-primary">
                    {isPrinting ? "..." : "Imprimir"}
                  </span>
                </Button>

                <Button
                  variant="secondary"
                  onClick={handleDownloadBackendPDF}
                  disabled={isDownloading}
                  className="flex flex-auto h-11 bg-token-surface-card border-token-border-technical hover:bg-token-surface-active rounded-sm"
                >
                  <DocumentArrowDownIcon
                    className={`w-4 h-4 mr-2 text-(--sidebar-text-active) shrink-0 ${isDownloading ? "animate-spin" : ""}`}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-token-text-primary">
                    {isDownloading ? "..." : "PDF"}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card
        variant="premium"
        noPadding
        className="border-token-border-technical overflow-hidden min-h-[600px] shadow-2xl shadow-black/5"
      >
        {viewMode === "day" ? (
          <DayView
            displayDate={displayDate}
            selectedEmployeeId={selectedEmployeeId}
            scheduleMap={scheduleMap}
            onNavigateToEmployeeMonth={(id) => {
              setSelectedEmployeeId(id);
              setViewMode("month");
            }}
          />
        ) : (
          <ShiftCalendarView
            viewMode={viewMode}
            currentDisplayDate={displayDate}
            selectedEmployeeId={selectedEmployeeId}
            scheduleMap={scheduleMap}
            onDayClick={handleDayDoubleClick}
          />
        )}
      </Card>
    </div>
  );
};
