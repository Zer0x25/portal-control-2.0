import React from "react";
import { ChevronDownIcon } from "../../../components/ui/icons/index";

import { CATEGORY_GROUPS, SEVERITIES } from "../../../constants/audit";

interface AuditLogFilters {
  categories: string[];
  severities: string[];
  outcomes: string[];
  actorUsername: string;
  action: string;
  startDate: string;
  endDate: string;
}

interface AuditLogFilterPanelProps {
  filters: AuditLogFilters;
  setFilters: React.Dispatch<React.SetStateAction<AuditLogFilters>>;
  isOpen: boolean;
  onToggle: () => void;
}

export const AuditLogFilterPanel: React.FC<AuditLogFilterPanelProps> = ({
  filters,
  setFilters,
  isOpen,
  onToggle,
}) => {
  const totalActive =
    filters.categories.length +
    filters.severities.length +
    filters.outcomes.length +
    (filters.actorUsername ? 1 : 0) +
    (filters.action ? 1 : 0) +
    (filters.startDate ? 1 : 0) +
    (filters.endDate ? 1 : 0);

  return (
    <div className="bg-token-surface-card border border-token-border-technical rounded-md shadow-sm">
      <button
        onClick={onToggle}
        className="w-full px-8 py-6 flex items-center justify-between hover:bg-token-surface-hover transition-colors group"
      >
        <div className="flex items-center gap-6">
          <div className="w-1 h-6 bg-indigo-700" />
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-token-text-primary">
              SISTEMA DE FILTRADO AVANZADO
            </h2>
            <p className="text-[9px] font-bold text-token-text-secondary uppercase tracking-widest mt-1">
              Refinar búsqueda por metadatos de auditoría
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {!isOpen && totalActive > 0 && (
            <span className="text-[9px] font-black text-white bg-indigo-700 px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm flex items-center gap-2">
              <span className="bg-white text-indigo-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold">
                {totalActive}
              </span>
              FILTROS ACTIVOS
            </span>
          )}

          <div className="w-8 h-8 rounded-md bg-token-surface-card border border-token-border-technical flex items-center justify-center group-hover:border-indigo-700 transition-colors">
            <div className={`transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}>
              <ChevronDownIcon className="w-5 h-5 text-token-text-secondary group-hover:text-indigo-700 transition-colors" />
            </div>
          </div>
        </div>
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity,visibility] duration-150 ${isOpen ? "grid-rows-[1fr] opacity-100 visible" : "grid-rows-[0fr] opacity-0 invisible"}`}
      >
        <div className="overflow-hidden">
          <div className="p-8 space-y-6 border-t border-token-border-technical bg-token-surface-card">
            {/* Filter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Category/Domain Filter */}
              <div className="lg:col-span-1">
                <label className="block text-[10px] font-black uppercase tracking-widest text-token-text-primary mb-3">
                  📂 Dominio
                </label>
                <div className="relative group/select">
                  <select
                    value={
                      filters.categories.length === 0
                        ? "ALL"
                        : CATEGORY_GROUPS.find((g) =>
                            g.categories.every((c) => filters.categories.includes(c.id)),
                          )?.name || "CUSTOM"
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "ALL") {
                        setFilters((prev) => ({ ...prev, categories: [] }));
                      } else {
                        const group = CATEGORY_GROUPS.find((g) => g.name === val);
                        if (group) {
                          setFilters((prev) => ({
                            ...prev,
                            categories: group.categories.map((c) => c.id),
                          }));
                        }
                      }
                    }}
                    className="w-full h-12 pl-4 pr-10 rounded-md bg-token-surface-card border border-token-border-technical text-sm font-semibold text-token-text-primary appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-700/20 focus:border-indigo-700 group-hover/select:border-indigo-700 transition-all"
                  >
                    <option value="ALL">Todos</option>
                    {CATEGORY_GROUPS.map((group) => (
                      <option key={group.name} value={group.name}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-token-text-tertiary">
                    <ChevronDownIcon className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Severity Filter */}
              <div className="lg:col-span-1">
                <label className="block text-[10px] font-black uppercase tracking-widest text-token-text-primary mb-3">
                  ⚠️ Severidad
                </label>
                <div className="space-y-2">
                  {SEVERITIES.map((sev) => (
                    <label
                      key={sev.id}
                      className="flex items-center gap-3 cursor-pointer group/checkbox hover:bg-token-surface-hover p-2 rounded-md transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={filters.severities.includes(sev.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters((prev) => ({
                              ...prev,
                              severities: [...prev.severities, sev.id],
                            }));
                          } else {
                            setFilters((prev) => ({
                              ...prev,
                              severities: prev.severities.filter((s) => s !== sev.id),
                            }));
                          }
                        }}
                        className="w-4 h-4 rounded border-token-border-technical text-indigo-700 focus:ring-indigo-700/20 cursor-pointer"
                      />
                      <div className={`w-2 h-2 rounded-full ${sev.color}`} />
                      <span className="text-sm font-medium text-token-text-secondary">
                        {sev.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Outcome Filter */}
              <div className="lg:col-span-1">
                <label className="block text-[10px] font-black uppercase tracking-widest text-token-text-primary mb-3">
                  ✓ Resultado
                </label>
                <div className="space-y-2">
                  {["SUCCESS", "FAILURE", "ERROR"].map((outcome) => (
                    <label
                      key={outcome}
                      className="flex items-center gap-3 cursor-pointer group/checkbox hover:bg-token-surface-hover p-2 rounded-md transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={filters.outcomes.includes(outcome)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters((prev) => ({
                              ...prev,
                              outcomes: [...prev.outcomes, outcome],
                            }));
                          } else {
                            setFilters((prev) => ({
                              ...prev,
                              outcomes: prev.outcomes.filter((o) => o !== outcome),
                            }));
                          }
                        }}
                        className="w-4 h-4 rounded border-token-border-technical text-indigo-700 focus:ring-indigo-700/20 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-token-text-secondary">
                        {outcome}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actor Search */}
              <div className="lg:col-span-1">
                <label className="block text-[10px] font-black uppercase tracking-widest text-token-text-primary mb-3">
                  👤 Usuario
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={filters.actorUsername}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, actorUsername: e.target.value }))
                    }
                    placeholder="Buscar por usuario..."
                    className="w-full h-12 pl-10 pr-4 rounded-md bg-token-surface-card border border-token-border-technical text-sm font-medium text-token-text-primary placeholder:text-token-text-tertiary focus:ring-2 focus:ring-indigo-700/20 focus:border-indigo-700 transition-all"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-token-text-tertiary pointer-events-none">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  {filters.actorUsername && (
                    <button
                      onClick={() => setFilters((prev) => ({ ...prev, actorUsername: "" }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-token-text-tertiary hover:text-token-text-primary"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Action Search */}
              <div className="lg:col-span-1">
                <label className="block text-[10px] font-black uppercase tracking-widest text-token-text-primary mb-3">
                  🔍 Acción
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={filters.action}
                    onChange={(e) => setFilters((prev) => ({ ...prev, action: e.target.value }))}
                    placeholder="Filtrar por acción..."
                    className="w-full h-12 pl-10 pr-4 rounded-md bg-token-surface-card border border-token-border-technical text-sm font-medium text-token-text-primary placeholder:text-token-text-tertiary focus:ring-2 focus:ring-indigo-700/20 focus:border-indigo-700 transition-all"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-token-text-tertiary pointer-events-none">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  {filters.action && (
                    <button
                      onClick={() => setFilters((prev) => ({ ...prev, action: "" }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-token-text-tertiary hover:text-token-text-primary"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Date Range Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-token-border-subtle">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-token-text-primary mb-3">
                  📅 Fecha Inicio
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="w-full h-12 px-4 rounded-md bg-token-surface-card border border-token-border-technical text-sm font-medium text-token-text-primary focus:ring-2 focus:ring-indigo-700/20 focus:border-indigo-700 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-token-text-primary mb-3">
                  📅 Fecha Fin
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="w-full h-12 px-4 rounded-md bg-token-surface-card border border-token-border-technical text-sm font-medium text-token-text-primary focus:ring-2 focus:ring-indigo-700/20 focus:border-indigo-700 transition-all"
                />
              </div>
            </div>

            {/* Active Filters Pills */}
            {totalActive > 0 && (
              <div className="pt-4 border-t border-token-border-subtle">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-token-text-secondary">
                    Filtros Activos
                  </span>
                  <button
                    onClick={() =>
                      setFilters({
                        categories: [],
                        severities: [],
                        outcomes: [],
                        actorUsername: "",
                        action: "",
                        startDate: "",
                        endDate: "",
                      })
                    }
                    className="text-[9px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 transition-colors"
                  >
                    Limpiar Todo
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filters.categories.map((cat) => (
                    <FilterPill
                      key={cat}
                      label={cat}
                      onRemove={() =>
                        setFilters((prev) => ({
                          ...prev,
                          categories: prev.categories.filter((c) => c !== cat),
                        }))
                      }
                      color="indigo"
                    />
                  ))}
                  {filters.severities.map((sev) => (
                    <FilterPill
                      key={sev}
                      label={sev}
                      onRemove={() =>
                        setFilters((prev) => ({
                          ...prev,
                          severities: prev.severities.filter((s) => s !== sev),
                        }))
                      }
                      color="amber"
                    />
                  ))}
                  {filters.outcomes.map((out) => (
                    <FilterPill
                      key={out}
                      label={out}
                      onRemove={() =>
                        setFilters((prev) => ({
                          ...prev,
                          outcomes: prev.outcomes.filter((o) => o !== out),
                        }))
                      }
                      color="emerald"
                    />
                  ))}
                  {filters.actorUsername && (
                    <FilterPill
                      label={`Usuario: ${filters.actorUsername}`}
                      onRemove={() => setFilters((prev) => ({ ...prev, actorUsername: "" }))}
                      color="sky"
                    />
                  )}
                  {filters.action && (
                    <FilterPill
                      label={`Acción: ${filters.action}`}
                      onRemove={() => setFilters((prev) => ({ ...prev, action: "" }))}
                      color="sky"
                    />
                  )}
                  {filters.startDate && (
                    <FilterPill
                      label={`Desde: ${filters.startDate}`}
                      onRemove={() => setFilters((prev) => ({ ...prev, startDate: "" }))}
                      color="violet"
                    />
                  )}
                  {filters.endDate && (
                    <FilterPill
                      label={`Hasta: ${filters.endDate}`}
                      onRemove={() => setFilters((prev) => ({ ...prev, endDate: "" }))}
                      color="violet"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface FilterPillProps {
  label: string;
  onRemove: () => void;
  color: "indigo" | "amber" | "emerald" | "sky" | "violet";
}

const FilterPill: React.FC<FilterPillProps> = ({ label, onRemove, color }) => {
  const colorClasses = {
    indigo:
      "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-100 border-indigo-300 dark:border-indigo-800 hover:text-indigo-600 dark:hover:text-indigo-300",
    amber:
      "bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 border-amber-300 dark:border-amber-800 hover:text-amber-600 dark:hover:text-amber-300",
    emerald:
      "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-100 border-emerald-300 dark:border-emerald-800 hover:text-emerald-600 dark:hover:text-emerald-300",
    sky: "bg-sky-100 dark:bg-sky-900/40 text-sky-900 dark:text-sky-100 border-sky-300 dark:border-sky-800 hover:text-sky-600 dark:hover:text-sky-300",
    violet:
      "bg-violet-100 dark:bg-violet-900/40 text-violet-900 dark:text-violet-100 border-violet-300 dark:border-violet-800 hover:text-violet-600 dark:hover:text-violet-300",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-full border ${colorClasses[color]}`}
    >
      {label}
      <button onClick={onRemove}>×</button>
    </span>
  );
};
