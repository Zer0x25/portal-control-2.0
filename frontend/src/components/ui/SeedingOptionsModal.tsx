import React, { useState } from "react";
import { useToasts } from "../../hooks/useToasts";
import Button from "./Button";
import Input from "./Input";
import { CloseIcon, SparklesIcon } from "./icons/index";

export interface SeedingOptions {
  employees: number;
  days: number;
  basePatternsCount: number;
  leaveRatio: number;
  correctionRequestRatio: number;
  shiftReportsPerDay: number;
  quickNotesCount: number;
}

interface SeedingOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: SeedingOptions) => void;
}

const SeedingOptionsModal: React.FC<SeedingOptionsModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { addToast } = useToasts();
  const [options, setOptions] = useState<SeedingOptions>({
    employees: 200,
    days: 2200,
    basePatternsCount: 3,
    leaveRatio: 5,
    correctionRequestRatio: 2,
    shiftReportsPerDay: 6,
    quickNotesCount: 5,
  });
  const [incrementalLevel, setIncrementalLevel] = useState(0);

  const incrementalPresets: SeedingOptions[] = [
    {
      employees: 15,
      days: 3,
      basePatternsCount: 2,
      leaveRatio: 4,
      correctionRequestRatio: 1,
      shiftReportsPerDay: 0,
      quickNotesCount: 20,
    },
    {
      employees: 30,
      days: 7,
      basePatternsCount: 3,
      leaveRatio: 4,
      correctionRequestRatio: 1,
      shiftReportsPerDay: 1,
      quickNotesCount: 40,
    },
    {
      employees: 60,
      days: 15,
      basePatternsCount: 4,
      leaveRatio: 5,
      correctionRequestRatio: 2,
      shiftReportsPerDay: 2,
      quickNotesCount: 80,
    },
    {
      employees: 120,
      days: 30,
      basePatternsCount: 5,
      leaveRatio: 6,
      correctionRequestRatio: 2,
      shiftReportsPerDay: 3,
      quickNotesCount: 140,
    },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setOptions((prev) => ({
      ...prev,
      [name]: type === "number" || type === "range" ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (options.employees <= 0 || options.days <= 0 || options.basePatternsCount < 1) {
      addToast("Los valores numericos deben ser validos.", "error");
      return;
    }
    onConfirm(options);
    onClose();
  };

  const applyQuickSeedPreset = () => {
    setOptions({
      employees: 15,
      days: 3,
      basePatternsCount: 2,
      leaveRatio: 4,
      correctionRequestRatio: 1,
      shiftReportsPerDay: 0,
      quickNotesCount: 20,
    });
    addToast("Preset Quick Seed aplicado.", "success");
  };

  const applyIncrementalPreset = () => {
    const nextLevel = Math.min(incrementalLevel + 1, incrementalPresets.length);
    const preset = incrementalPresets[nextLevel - 1];
    if (!preset) return;
    setOptions(preset);
    setIncrementalLevel(nextLevel);
    addToast(
      `Preset incremental aplicado (nivel ${nextLevel}/${incrementalPresets.length}).`,
      "success",
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black bg-opacity-70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="seeding-options-title"
    >
      <div
        className="bg-gray-800 text-white rounded-lg shadow-2xl border border-gray-600 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-600 flex justify-between items-center">
          <h3 id="seeding-options-title" className="font-semibold text-lg flex items-center">
            <SparklesIcon className="w-5 h-5 mr-2 text-yellow-400" />
            Panel de Simulacion de Datos
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-700"
            aria-label="Cerrar modal"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-md border border-gray-700 bg-gray-900/40">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-200">
                  Quick Seed
                </p>
                <p className="text-[11px] text-gray-400">
                  15 empleados, 3 dias, sin carga pesada para validacion manual.
                </p>
              </div>
              <Button type="button" variant="secondary" onClick={applyQuickSeedPreset}>
                Aplicar
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-md border border-gray-700 bg-gray-900/40">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-200">
                  Incremental
                </p>
                <p className="text-[11px] text-gray-400">
                  Sube carga por niveles para stress testing controlado.
                </p>
              </div>
              <Button type="button" variant="secondary" onClick={applyIncrementalPreset}>
                Nivel +1
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="N Empleados"
                type="number"
                name="employees"
                value={options.employees}
                onChange={handleInputChange}
                min="1"
                max="3000"
              />
              <Input
                label="Dias de Historial"
                type="number"
                name="days"
                value={options.days}
                onChange={handleInputChange}
                min="1"
                max="7300"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Patrones Base"
                type="number"
                name="basePatternsCount"
                value={options.basePatternsCount}
                onChange={handleInputChange}
                min="1"
                max="12"
              />
              <Input
                label="% Ausentismo"
                type="number"
                name="leaveRatio"
                value={options.leaveRatio}
                onChange={handleInputChange}
                min="0"
                max="100"
              />
              <Input
                label="% Correcciones"
                type="number"
                name="correctionRequestRatio"
                value={options.correctionRequestRatio}
                onChange={handleInputChange}
                min="0"
                max="100"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Reportes Turno/dia"
                type="number"
                name="shiftReportsPerDay"
                value={options.shiftReportsPerDay}
                onChange={handleInputChange}
                min="0"
                max="6"
              />
              <Input
                label="Quick Notes"
                type="number"
                name="quickNotesCount"
                value={options.quickNotesCount}
                onChange={handleInputChange}
                min="0"
                max="2000"
              />
            </div>

            <div className="pt-4 text-xs text-gray-400 border-t border-gray-700 mt-2">
              <p>
                * Patrones Base define cuantas plantillas de turno se crean y se distribuyen en
                forma pareja.
              </p>
              <p>* El % de Correcciones se aplica a los registros recientes completados.</p>
              <p>* El % de Ausentismo ahora tambien se usa para crear Leave Records.</p>
              <p>* Reportes de turno se generan sobre una ventana maxima de 365 dias.</p>
            </div>
          </div>
          <div className="p-4 border-t border-gray-600 flex justify-end gap-2">
            <Button type="button" onClick={onClose} variant="secondary">
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Iniciar Simulacion
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SeedingOptionsModal;
