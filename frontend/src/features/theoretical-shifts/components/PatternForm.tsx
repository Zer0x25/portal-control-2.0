import React, { useCallback } from "react";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import {
  PlusCircleIcon,
  ClipboardIcon,
  ClipboardCheckIcon,
  EditIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "../../../components/ui/icons/index";
import { motion, AnimatePresence } from "framer-motion";
import type { DayInCycleSchedule, TheoreticalShiftPattern } from "../../../types";

const daysOfWeekOptions = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 7, label: "Domingo" },
];

const getDayOfWeekName = (dayIndex: number, startDayOfWeek: number): string => {
  const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const finalIndex = (startDayOfWeek - 1 + dayIndex) % 7;
  return dayNames[finalIndex];
};

interface PatternFormProps {
  onCancel: () => void;
  onSave: () => Promise<boolean>;
  patternForm: {
    editingPattern: TheoreticalShiftPattern | null;
    patternName: string;
    setPatternName: React.Dispatch<React.SetStateAction<string>>;
    patternCycleLength: number;
    setPatternCycleLength: (value: number) => void;
    startDayOfWeek: number;
    setStartDayOfWeek: React.Dispatch<React.SetStateAction<number>>;
    patternDailySchedules: DayInCycleSchedule[];
    handleDailyScheduleChange: (
      index: number,
      field: keyof DayInCycleSchedule,
      value: string | boolean | number,
    ) => void;
    patternColor: string;
    setPatternColor: React.Dispatch<React.SetStateAction<string>>;
    patternMaxHoursInput: number;
    setPatternMaxHoursInput: React.Dispatch<React.SetStateAction<number>>;
    patternWorksOnHolidays: boolean;
    setPatternWorksOnHolidays: React.Dispatch<React.SetStateAction<boolean>>;
    copiedDailySchedule: Omit<DayInCycleSchedule, "dayIndex" | "hours"> | null;
    handleCopyDailySchedule: (dayIndex: number) => void;
    handlePasteDailySchedule: (targetDayIndex: number) => void;
    calculatedPatternWeeklyHours: number;
    globalMaxWeeklyHours: number;
  };
}

const PatternForm: React.FC<PatternFormProps> = ({ onCancel, onSave, patternForm }) => {
  const renderPlaceholders = useCallback(
    () =>
      Array.from({
        length: patternForm.startDayOfWeek > 1 ? patternForm.startDayOfWeek - 1 : 0,
      }).map((_, i) => (
        <div
          key={`ph-${i}`}
          className="p-4 border-2 border-dashed rounded-2xl dark:border-gray-700/50 bg-gray-50/20 dark:bg-gray-800/10 min-h-64 hidden lg:flex items-center justify-center"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300 dark:text-gray-600 rotate-90">
            Anterior
          </span>
        </div>
      )),
    [patternForm.startDayOfWeek],
  );

  return (
    <div className="space-y-8 pb-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <div className="w-2 h-6 bg-sap-blue dark:bg-sap-light-blue rounded-full"></div>
          {patternForm.editingPattern ? "Editar Patrón de Turno" : "Nuevo Patrón de Turno"}
        </h3>
        <div className="hidden sm:flex items-center gap-4 px-4 py-2 bg-white/30 dark:bg-gray-800/20 rounded-xl border border-white/20 dark:border-gray-700/50 relative group">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Horas Semanales
            </span>
            <div className="flex items-center gap-2">
              {patternForm.calculatedPatternWeeklyHours > patternForm.globalMaxWeeklyHours && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                </motion.div>
              )}
              <span
                className={`text-sm font-mono font-bold ${patternForm.calculatedPatternWeeklyHours > patternForm.globalMaxWeeklyHours ? "text-red-500" : "text-sap-blue dark:text-sap-light-blue"}`}
              >
                {patternForm.calculatedPatternWeeklyHours.toFixed(2)} /{" "}
                {patternForm.globalMaxWeeklyHours}
              </span>
            </div>
          </div>
          {patternForm.calculatedPatternWeeklyHours > patternForm.globalMaxWeeklyHours && (
            <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-red-600 text-white text-[10px] font-bold rounded-xl shadow-xl z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <p className="flex items-center gap-2">
                <ExclamationTriangleIcon className="w-3 h-3" />
                ADVERTENCIA LEGAL
              </p>
              <p className="mt-1 font-medium opacity-90">
                La jornada semanal promedio ({patternForm.calculatedPatternWeeklyHours}h) excede el
                máximo permitido de {patternForm.globalMaxWeeklyHours}h. Verifique la legalidad de
                este patrón antes de guardarlo.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-12 lg:col-span-5">
          <Input
            label="Nombre del Patrón"
            value={patternForm.patternName}
            onChange={(e) => patternForm.setPatternName(e.target.value)}
            placeholder="Ej: Turno Mañana 5x2"
            className="rounded-xl!"
          />
        </div>
        <div className="md:col-span-4 lg:col-span-2">
          <Input
            label="Días Ciclo"
            type="number"
            min="1"
            max="99"
            value={String(patternForm.patternCycleLength)}
            onChange={(e) => patternForm.setPatternCycleLength(parseInt(e.target.value, 10) || 1)}
            className="rounded-xl!"
          />
        </div>
        <div className="md:col-span-4 lg:col-span-2">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 pl-1">
            Posición Inicio
          </label>
          <select
            value={patternForm.startDayOfWeek}
            onChange={(e) => patternForm.setStartDayOfWeek(parseInt(e.target.value, 10))}
            className="w-full h-[46px] px-4 py-2 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sap-blue outline-none transition-all dark:text-gray-100 appearance-none cursor-pointer"
          >
            {daysOfWeekOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.value}. {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-4 lg:col-span-2">
          <Input
            label="Límite Horas"
            type="number"
            min="1"
            max={patternForm.globalMaxWeeklyHours}
            value={String(patternForm.patternMaxHoursInput)}
            onChange={(e) => patternForm.setPatternMaxHoursInput(parseInt(e.target.value, 10) || 0)}
            title={`Máx. legal: ${patternForm.globalMaxWeeklyHours} hrs.`}
            className="rounded-xl!"
          />
        </div>
        <div className="md:col-span-12 lg:col-span-1">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 pl-1 whitespace-nowrap text-center">
            Color
          </label>
          <div className="relative h-[46px] w-full group">
            <input
              type="color"
              value={patternForm.patternColor}
              onChange={(e) => patternForm.setPatternColor(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div
              className="w-full h-full rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-transform group-hover:scale-105"
              style={{ backgroundColor: patternForm.patternColor }}
            ></div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 px-5 py-3 bg-red-500/5 dark:bg-red-500/10 border border-red-200/20 dark:border-red-500/20 rounded-2xl">
        <input
          type="checkbox"
          id="holidayWorks"
          checked={patternForm.patternWorksOnHolidays}
          onChange={(e) => patternForm.setPatternWorksOnHolidays(e.target.checked)}
          className="w-5 h-5 rounded border-gray-300 text-sap-blue focus:ring-sap-blue cursor-pointer"
        />
        <label
          htmlFor="holidayWorks"
          className="text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer select-none"
        >
          Este patrón trabaja en días feriados
        </label>
      </div>

      <div>
        <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-6 flex items-center gap-3">
          Definición de Jornadas Diarias
          <div className="flex-1 h-px bg-linear-to-r from-gray-200 dark:from-gray-800 to-transparent"></div>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
          {renderPlaceholders()}
          {patternForm.patternDailySchedules.map((s, i) => (
            <motion.div
              key={i}
              layout
              className={`flex flex-col p-4 rounded-2xl border transition-all duration-300 ${s.isOffDay ? "bg-gray-100/20 dark:bg-gray-800/20 border-gray-200/30 dark:border-white/5 opacity-60" : "bg-white/40 dark:bg-gray-900/40 backdrop-blur-sm border-white/20 dark:border-white/5 shadow-xl shadow-black/5 hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/10"}`}
            >
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-[10px] font-bold text-sap-blue dark:text-sap-light-blue uppercase tracking-tighter">
                    Día {s.dayIndex + 1}
                  </p>
                  <p className="text-xs font-bold text-gray-900 dark:text-gray-100">
                    {getDayOfWeekName(s.dayIndex, patternForm.startDayOfWeek)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => patternForm.handleCopyDailySchedule(i)}
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-blue-600"
                    title="Copiar horario"
                  >
                    <ClipboardIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => patternForm.handlePasteDailySchedule(i)}
                    className={`p-1.5 rounded-lg transition-colors ${!patternForm.copiedDailySchedule ? "opacity-30 cursor-not-allowed" : "hover:bg-white dark:hover:bg-gray-700 text-gray-400 hover:text-emerald-600"}`}
                    title="Pegar horario"
                    disabled={!patternForm.copiedDailySchedule}
                  >
                    <ClipboardCheckIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-4 grow">
                <label className="flex items-center group cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={s.isOffDay}
                      onChange={(e) =>
                        patternForm.handleDailyScheduleChange(i, "isOffDay", e.target.checked)
                      }
                      className="sr-only"
                    />
                    <div
                      className={`w-9 h-5 rounded-full transition-colors duration-200 ${s.isOffDay ? "bg-gray-400 dark:bg-gray-600" : "bg-green-500"}`}
                    ></div>
                    <div
                      className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform duration-200 ${s.isOffDay ? "translate-x-4" : ""}`}
                    ></div>
                  </div>
                  <span
                    className={`ml-2 text-xs font-bold uppercase transition-colors ${s.isOffDay ? "text-gray-500" : "text-green-600 dark:text-green-400"}`}
                  >
                    {s.isOffDay ? "Libre" : "Trabaja"}
                  </span>
                </label>

                <AnimatePresence mode="wait">
                  {!s.isOffDay && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="space-y-3"
                    >
                      <div className="grid grid-cols-1 gap-2">
                        <div className="relative">
                          <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                          <input
                            type="time"
                            value={s.startTime || ""}
                            onChange={(e) =>
                              patternForm.handleDailyScheduleChange(i, "startTime", e.target.value)
                            }
                            className="w-full pl-9 pr-2 py-2 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-sap-blue transition-all"
                          />
                        </div>
                        <div className="relative">
                          <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                          <input
                            type="time"
                            value={s.endTime || ""}
                            onChange={(e) =>
                              patternForm.handleDailyScheduleChange(i, "endTime", e.target.value)
                            }
                            className="w-full pl-9 pr-2 py-2 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-sap-blue transition-all"
                          />
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                        <label className="flex items-center gap-2 mb-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={s.hasColacion}
                            onChange={(e) =>
                              patternForm.handleDailyScheduleChange(
                                i,
                                "hasColacion",
                                e.target.checked,
                              )
                            }
                            className="w-3.5 h-3.5 rounded border-gray-300 text-sap-blue"
                          />
                          <span className="text-[10px] font-bold text-gray-500 uppercase">
                            Colación
                          </span>
                        </label>
                        {s.hasColacion && (
                          <input
                            type="number"
                            min="0"
                            value={String(s.colacionMinutes)}
                            onChange={(e) =>
                              patternForm.handleDailyScheduleChange(
                                i,
                                "colacionMinutes",
                                parseInt(e.target.value, 10) || 0,
                              )
                            }
                            className="w-full px-3 py-1.5 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-[10px] outline-none focus:ring-2 focus:ring-sap-blue"
                            placeholder="Minutos"
                          />
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Horas:</span>
                <span
                  className={`text-xs font-black font-mono ${s.isOffDay ? "text-gray-300" : "text-sap-blue dark:text-sap-light-blue"}`}
                >
                  {s.hours?.toFixed(2) || "0.00"}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 pt-4 border-t border-white/20 dark:border-gray-700/50 justify-end">
        <Button variant="secondary" onClick={onCancel} className="px-8 rounded-xl!">
          Cancelar
        </Button>
        <Button
          onClick={onSave}
          className="px-10 shadow-lg shadow-sap-blue/20 rounded-xl! flex items-center gap-2"
        >
          {patternForm.editingPattern ? (
            <EditIcon className="w-5 h-5" />
          ) : (
            <PlusCircleIcon className="w-5 h-5" />
          )}
          {patternForm.editingPattern ? "Actualizar Patrón" : "Guardar Patrón"}
        </Button>
      </div>
    </div>
  );
};

export default PatternForm;
