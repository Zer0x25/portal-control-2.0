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
            <h2 className="text-lg font-black text-token-text-primary uppercase tracking-tight italic leading-none">
              Registro de Medidores
            </h2>
            <p className="text-[9px] font-black text-token-text-tertiary uppercase tracking-[0.3em] mt-1 italic leading-none">
              Control de Consumos
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-4xl"
    >
      <div className="flex flex-col md:flex-row -m-6 h-[calc(85vh-80px)]">
        {/* Form Section */}
        <div className="w-full md:w-5/12 p-8 border-b md:border-b-0 md:border-r border-token-border-subtle bg-token-surface-stripe overflow-y-auto">
          <div className="flex items-center gap-2 mb-6">
            <DocumentChartBarIcon className="w-4 h-4 text-sap-blue" />
            <h3 className="text-[10px] font-black text-token-text-secondary uppercase tracking-[0.2em] italic">
              Nueva Lectura
            </h3>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-4">
                <div className="w-8 h-8 border-4 border-sap-blue/20 border-t-sap-blue rounded-full animate-spin" />
                <p className="text-[10px] font-black text-token-text-tertiary uppercase tracking-widest">
                  Cargando config...
                </p>
              </div>
            ) : meterConfigs.length > 0 ? (
              <div className="space-y-5">
                {meterConfigs.map((config) => (
                  <div key={config.id} className="space-y-2 group">
                    <label className="text-[10px] font-black text-token-text-secondary uppercase tracking-widest ml-4 transition-colors group-focus-within:text-sap-blue italic">
                      {config.name}
                    </label>
                    <Input
                      id={`meter-${config.id}`}
                      type="text"
                      value={readingValues[config.id] || ""}
                      onChange={(e) => handleInputChange(config.id, e.target.value)}
                      placeholder="00.00"
                      className="rounded-md! h-12! bg-token-surface-card! border-token-border-technical! text-token-text-primary! focus:ring-4! focus:ring-sap-blue/10! transition-all! font-mono text-center text-lg active:scale-[0.98]"
                      autoComplete="off"
                    />
                  </div>
                ))}
                <div className="pt-4">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full h-12 rounded-md font-black uppercase text-xs tracking-[0.2em]"
                    disabled={isLoading || meterConfigs.length === 0}
                  >
                    Guardar Lectura
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-md bg-amber-500/5 border border-amber-500/10 text-center">
                <p className="text-[10px] font-black text-token-status-warning uppercase tracking-widest leading-relaxed">
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
              <h3 className="text-[10px] font-black text-token-text-secondary uppercase tracking-[0.2em] italic">
                Últimos Registros
              </h3>
            </div>
            <span className="text-[9px] font-black text-token-text-tertiary uppercase tracking-widest italic">
              Muestra: 20
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-token-text-tertiary font-bold animate-pulse uppercase tracking-[0.2em] text-[10px]">
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
                      className="flex items-center justify-between p-4 bg-token-surface-card rounded-md border border-token-border-technical hover:border-sap-blue/20 transition-all group"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-black text-token-text-tertiary uppercase tracking-widest leading-none">
                          {new Date(readingItem.timestamp).toLocaleString("es-CL", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="text-sm font-black text-token-text-primary uppercase italic">
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
                <p className="text-token-text-tertiary font-bold uppercase tracking-widest text-xs italic">
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
