import type { FC } from "react";
import { MeterReadingItem, METER_CATEGORIES } from "../../../types";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import SingleMeterInputModal from "../components/SingleMeterInputModal.container";
import DatePickerDialog from "../../../components/ui/DatePickerDialog";
import { ChevronRightIcon, ArrowUturnLeftIcon } from "../../../components/ui/icons";
import { Z } from "../../../constants/zScale";
import type { MeterHistoryController } from "../hooks/useMeterHistoryController";

const MeterHistoryView: FC<MeterHistoryController> = (controller) => {
  const {
    meterConfigs,
    filters,
    setFilters,
    selectedMeterForInput,
    setSelectedMeterForInput,
    isStartDatePickerOpen,
    setIsStartDatePickerOpen,
    isEndDatePickerOpen,
    setIsEndDatePickerOpen,
    isMobile,
    isFetchingNextPage,
    isLoading,
    displayReadings,
    meterConfigById,
    sentinelRef,
    kpiData,
    handleClearFilters,
  } = controller;

  const EVENT_TYPE_LABELS: Record<MeterReadingItem["eventType"], string> = {
    CONSUMPTION: "Consumo",
    RECHARGE: "Recarga Parcial",
    FULL_RECHARGE: "Llenado Total",
    INITIAL: "Lectura Inicial",
    INSTANTANEOUS: "Lectura Instantánea",
    ADJUSTMENT: "Ajuste Positivo",
    UNKNOWN: "Sin cambios",
  };

  const renderDesktopView = () => (
    <div className="overflow-x-auto min-h-[400px] max-h-[800px] overflow-y-auto custom-scrollbar">
      <table className="min-w-full text-sm relative">
        <thead className={`bg-token-surface-header sticky top-0 ${Z.sticky} shadow-sm`}>
          <tr>
            <th className="p-2 text-left">Fecha</th>
            <th className="p-2 text-left">Medidor</th>
            <th className="p-2 text-left">Valor Ingresado</th>
            <th className="p-2 text-left">Normalizado</th>
            <th className="p-2 text-left">Delta</th>
            <th className="p-2 text-left text-token-text-secondary uppercase text-[10px] font-black tracking-widest border-b border-token-border-subtle">
              Evento
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-token-border-subtle">
          {displayReadings.length === 0 && !isLoading ? (
            <tr>
              <td colSpan={6} className="p-8 text-center text-token-text-tertiary">
                No se encontraron lecturas disponibles.
              </td>
            </tr>
          ) : (
            displayReadings.map((r) => {
              const config = meterConfigById.get(r.meterConfigId);
              if (!config) return null;
              const unit = config.unit;
              const deltaColor = r.delta < 0 ? "text-red-500" : "text-green-500";

              return (
                <tr key={r.id} className="hover:bg-token-surface-active transition-colors">
                  <td className="p-2 text-token-text-primary whitespace-nowrap">
                    {new Date(r.timestamp).toLocaleString("es-CL")}
                  </td>
                  <td className="p-2 text-token-text-primary font-bold">{config.name}</td>
                  <td className="p-2 font-mono text-token-text-primary">
                    {r.isRecharge ? "+" : ""}
                    {r.value.toFixed(2)} {config.type === "PERCENT" ? "%" : unit}
                  </td>
                  <td className="p-2 font-mono text-token-text-primary">
                    {r.normalizedValue.toFixed(2)} {unit}
                  </td>
                  <td className={`p-2 font-mono font-semibold ${deltaColor}`}>
                    {r.delta !== 0 ? r.delta.toFixed(2) : "-"}
                  </td>
                  <td className="p-2 text-token-text-secondary">
                    {EVENT_TYPE_LABELS[r.eventType] || "N/A"}
                  </td>
                </tr>
              );
            })
          )}
          {/* Sentinel for Desktop */}
          <tr>
            <td colSpan={6} className="p-0">
              <div ref={sentinelRef} className="h-4 w-full" />
              {isFetchingNextPage && (
                <div className="p-4 text-center text-xs font-bold text-token-text-tertiary uppercase tracking-widest animate-pulse">
                  Cargando más registros...
                </div>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderMobileView = () => (
    <div className="space-y-3 min-h-[400px]">
      {displayReadings.length === 0 && !isLoading ? (
        <p className="text-center text-token-text-tertiary py-8">
          No se encontraron lecturas disponibles.
        </p>
      ) : (
        displayReadings.map((r) => {
          const config = meterConfigById.get(r.meterConfigId);
          if (!config) return null;
          const unit = config.unit;
          const deltaColor = r.delta < 0 ? "text-red-500" : "text-green-500";

          return (
            <div
              key={r.id}
              className="p-4 rounded-lg shadow-sm bg-token-surface-card border border-token-border-subtle border-l-4 border-l-sap-blue"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-token-text-primary uppercase tracking-tight">
                    {config.name}
                  </p>
                  <p className="text-[10px] font-black text-token-text-tertiary uppercase tracking-widest mt-0.5">
                    {new Date(r.timestamp).toLocaleString("es-CL")}
                  </p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                  {EVENT_TYPE_LABELS[r.eventType] || "N/A"}
                </span>
              </div>
              <div className="mt-3 text-[11px] text-token-text-secondary grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-token-border-subtle">
                <span>
                  Ingresado:{" "}
                  <strong className="font-mono text-token-text-primary">
                    {r.isRecharge ? "+" : ""}
                    {r.value.toFixed(2)} {config.type === "PERCENT" ? "%" : unit}
                  </strong>
                </span>
                <span>
                  Normalizado:{" "}
                  <strong className="font-mono text-token-text-primary">
                    {r.normalizedValue.toFixed(2)} {unit}
                  </strong>
                </span>
                <span>
                  Delta:{" "}
                  <strong className={`font-mono ${deltaColor}`}>
                    {r.delta !== 0 ? r.delta.toFixed(2) : "-"}
                  </strong>
                </span>
              </div>
            </div>
          );
        })
      )}
      {/* Sentinel for Mobile */}
      <div ref={sentinelRef} className="h-4 w-full" />
      {isFetchingNextPage && (
        <div className="p-4 text-center text-xs font-bold text-token-text-tertiary uppercase tracking-widest animate-pulse">
          Cargando más registros...
        </div>
      )}
    </div>
  );

  return (
    <>
      <Card title="Historial y Estadísticas de Lecturas">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
          {meterConfigs.map((config) => (
            <div
              key={config.id}
              className="p-4 border rounded-lg border-token-border-subtle bg-token-surface-stripe cursor-pointer hover:shadow-md hover:border-sap-blue transition-all"
              onDoubleClick={() => setSelectedMeterForInput(config)}
              title="Doble click para ingreso rápido"
            >
              <h4 className="font-bold text-sap-blue truncate">{config.name}</h4>
              <p className="text-[10px] font-black text-token-text-tertiary uppercase tracking-widest">
                {METER_CATEGORIES[config.category]}
              </p>
              <div className="mt-2 pt-2 border-t border-token-border-subtle">
                <p className="text-2xl font-black text-token-text-primary italic tracking-tighter">
                  {kpiData[config.id]?.lastReadingValue}{" "}
                  <span className="text-base font-normal not-italic tracking-normal">
                    {kpiData[config.id]?.lastReadingUnit}
                  </span>
                </p>
                <p className="text-[10px] font-black text-token-text-tertiary uppercase tracking-tight mt-1">
                  Última lectura el {kpiData[config.id]?.lastReadingDate}
                </p>
              </div>
              <div className="mt-3 text-[11px] space-y-1 text-token-text-secondary border-t border-token-border-subtle pt-2">
                <p className="flex justify-between">
                  <strong>Diario:</strong> <span>{kpiData[config.id]?.avgDaily}</span>
                </p>
                <p className="flex justify-between">
                  <strong>Semanal:</strong> <span>{kpiData[config.id]?.avgWeekly}</span>
                </p>
                <p className="flex justify-between">
                  <strong>Mensual:</strong> <span>{kpiData[config.id]?.avgMonthly}</span>
                </p>
              </div>
            </div>
          ))}
          {meterConfigs.length === 0 && (
            <p className="text-center text-sm text-token-text-tertiary font-bold py-4 col-span-full">
              No hay medidores configurados para mostrar KPIs.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="relative group">
            <label
              className={`absolute -top-2 left-3 px-1.5 bg-token-surface-card text-xxs font-black text-sap-blue uppercase tracking-widest rounded ${Z.sticky} transition-all group-focus-within:scale-110`}
            >
              Desde
            </label>
            <button
              onClick={() => setIsStartDatePickerOpen(true)}
              className="w-full px-4 py-3 text-xs bg-token-surface-card border border-token-border-subtle rounded-lg outline-none transition-all font-bold text-token-text-primary text-left flex justify-between items-center hover:border-sap-blue/30"
            >
              <span>
                {filters.startDate
                  ? new Date(filters.startDate + "T12:00:00").toLocaleDateString("es-CL")
                  : "Seleccionar"}
              </span>
              <ChevronRightIcon className="w-4 h-4 text-sap-blue rotate-90 opacity-40" />
            </button>
            <DatePickerDialog
              isOpen={isStartDatePickerOpen}
              onClose={() => setIsStartDatePickerOpen(false)}
              onSelect={(date) => setFilters((f) => ({ ...f, startDate: date }))}
              initialDate={filters.startDate}
            />
          </div>

          <div className="relative group">
            <label
              className={`absolute -top-2 left-3 px-1.5 bg-token-surface-card text-xxs font-black text-sap-blue uppercase tracking-widest rounded ${Z.sticky} transition-all group-focus-within:scale-110`}
            >
              Hasta
            </label>
            <button
              onClick={() => setIsEndDatePickerOpen(true)}
              className="w-full px-4 py-3 text-xs bg-token-surface-card border border-token-border-subtle rounded-lg outline-none transition-all font-bold text-token-text-primary text-left flex justify-between items-center hover:border-sap-blue/30"
            >
              <span>
                {filters.endDate
                  ? new Date(filters.endDate + "T12:00:00").toLocaleDateString("es-CL")
                  : "Seleccionar"}
              </span>
              <ChevronRightIcon className="w-4 h-4 text-sap-blue rotate-90 opacity-40" />
            </button>
            <DatePickerDialog
              isOpen={isEndDatePickerOpen}
              onClose={() => setIsEndDatePickerOpen(false)}
              onSelect={(date) => setFilters((f) => ({ ...f, endDate: date }))}
              initialDate={filters.endDate}
            />
          </div>
          <select
            value={filters.meterId}
            onChange={(e) => setFilters((f) => ({ ...f, meterId: e.target.value }))}
            className="w-full p-2 border rounded border-token-border-subtle bg-token-surface-card text-token-text-primary text-sm font-bold"
          >
            <option value="">Todos los medidores</option>
            {meterConfigs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button
            onClick={handleClearFilters}
            variant="secondary"
            className="sm:col-span-3 flex items-center justify-center gap-2"
          >
            <ArrowUturnLeftIcon className="w-4 h-4" /> Limpiar Filtros
          </Button>
        </div>

        {isMobile ? renderMobileView() : renderDesktopView()}
      </Card>
      <SingleMeterInputModal
        isOpen={!!selectedMeterForInput}
        onClose={() => setSelectedMeterForInput(null)}
        meterConfig={selectedMeterForInput}
      />
    </>
  );
};

export default MeterHistoryView;
