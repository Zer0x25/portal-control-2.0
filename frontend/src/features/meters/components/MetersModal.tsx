import React, { useState, useEffect, useMemo } from "react";
import { useMeterReadings } from "../../../hooks/useMeterReadings";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import {
  DocumentChartBarIcon,
  ArrowPathIcon,
  BeakerIcon,
} from "../../../components/ui/icons/index";

interface MetersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ReadingState = { [key: string]: string };

import CinematicModal from "../../../components/ui/CinematicModal";

const MetersModal: React.FC<MetersModalProps> = ({ isOpen, onClose }) => {
  const { readings, isLoadingReadings, addReading, meterConfigs } = useMeterReadings();
  const [readingValues, setReadingValues] = useState<ReadingState>({});
  const meterConfigById = useMemo(
    () => new Map(meterConfigs.map((config) => [config.id, config])),
    [meterConfigs],
  );

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens by creating an object with keys for each meter and empty string values.
      const initialValues: ReadingState = {};
      meterConfigs.forEach((config) => {
        initialValues[config.id] = "";
      });
      setReadingValues(initialValues);
    }
  }, [isOpen, meterConfigs]);

  const handleInputChange = (meterId: string, value: string) => {
    setReadingValues((prev) => ({ ...prev, [meterId]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const readingsToSave = Object.entries(readingValues)
      .filter(([, value]) => value.trim() !== "")
      .map(([meterConfigId, value]) => ({
        meterConfigId,
        value,
      }));

    if (readingsToSave.length === 0) {
      return;
    }

    const success = await addReading(readingsToSave);
    if (success) {
      onClose();
    }
  };

  const isLoading = isLoadingReadings;

  return (
    <CinematicModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-sap-blue/10 flex items-center justify-center text-sap-blue border border-sap-blue/20">
            <BeakerIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight italic leading-none">
              Registro de Medidores
            </h2>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mt-1 italic leading-none">
              Control de Consumos
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-4xl"
    >
      <div className="flex flex-col md:flex-row -m-6 h-[calc(85vh-80px)]">
        {/* Form Section */}
        <div className="w-full md:w-5/12 p-8 border-b md:border-b-0 md:border-r border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20 overflow-y-auto">
          <div className="flex items-center gap-2 mb-6">
            <DocumentChartBarIcon className="w-4 h-4 text-sap-blue" />
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">
              Nueva Lectura
            </h3>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-4">
                <div className="w-8 h-8 border-4 border-sap-blue/20 border-t-sap-blue rounded-full animate-spin" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Cargando config...
                </p>
              </div>
            ) : meterConfigs.length > 0 ? (
              <div className="space-y-5">
                {meterConfigs.map((config) => (
                  <div key={config.id} className="space-y-2 group">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 transition-colors group-focus-within:text-sap-blue italic">
                      {config.name}
                    </label>
                    <Input
                      id={`meter-${config.id}`}
                      type="text"
                      value={readingValues[config.id] || ""}
                      onChange={(e) => handleInputChange(config.id, e.target.value)}
                      placeholder="00.00"
                      className="!rounded-2xl !h-12 !bg-white dark:!bg-gray-800/50 !border-gray-100 dark:!border-gray-700 focus:!ring-4 focus:!ring-sap-blue/10 !transition-all font-mono text-center text-lg active:scale-[0.98]"
                      autoComplete="off"
                    />
                  </div>
                ))}
                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full bg-sap-blue text-white shadow-lg shadow-blue-500/20 h-12 rounded-2xl font-black uppercase text-xs tracking-[0.2em]"
                    disabled={isLoading || meterConfigs.length === 0}
                  >
                    Guardar Lectura
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-center">
                <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest leading-relaxed">
                  No hay medidores configurados. Un administrador debe gestionarlos.
                </p>
              </div>
            )}
          </form>
        </div>

        {/* History Section */}
        <div className="w-full md:w-7/12 p-8 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <ArrowPathIcon className="w-4 h-4 text-sap-blue" />
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] italic">
                Últimos Registros
              </h3>
            </div>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic">
              Muestra: 20
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-400 font-bold animate-pulse uppercase tracking-[0.2em] text-[10px]">
                  Cargando historial...
                </p>
              </div>
            ) : readings.length > 0 ? (
              <div className="space-y-2">
                {readings.slice(0, 20).map((readingItem) => {
                  const config = meterConfigById.get(readingItem.meterConfigId);
                  return (
                    <div
                      key={readingItem.id}
                      className="flex items-center justify-between p-4 bg-white/40 dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-white/5 hover:border-sap-blue/20 transition-all group"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                          {new Date(readingItem.timestamp).toLocaleString("es-CL", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase italic">
                          {config?.name || "Sistema"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black font-mono text-sap-blue dark:text-sap-light-blue tracking-tighter group-hover:scale-110 transition-transform block italic">
                          {readingItem.value}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center opacity-40">
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs italic">
                  Sin registros previos
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </CinematicModal>
  );
};

export default MetersModal;
