import React from "react";
import {
  CalculatorIcon,
  CogIcon,
  PlusCircleIcon,
  CloseIcon,
} from "../../../components/ui/icons/index";
import Button from "../../../components/ui/Button";
import MeterConfigPanel from "../components/MeterConfigPanel";
import MeterForm from "../components/MeterForm";
import MeterHistory from "../components/MeterHistory";

export interface MeterReadingsViewProps {
  isLoadingReadings: boolean;
  isConfigPanelOpen: boolean;
  isFormOpen: boolean;
  setIsConfigPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsFormOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const MeterReadingsView: React.FC<MeterReadingsViewProps> = ({
  isLoadingReadings,
  isConfigPanelOpen,
  isFormOpen,
  setIsConfigPanelOpen,
  setIsFormOpen,
}) => {
  return (
    <div className="space-y-6" data-ui-protected>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-semibold text-token-text-primary flex items-center gap-3">
          <CalculatorIcon className="w-8 h-8 text-sap-blue" />
          Registro de Medidores
        </h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsFormOpen(true)}
            variant="primary"
            className="flex items-center gap-2"
          >
            <PlusCircleIcon className="w-5 h-5" />
            Ingresar Lecturas
          </Button>
          <Button
            onClick={() => setIsConfigPanelOpen(true)}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <CogIcon className="w-5 h-5" />
            Configurar Medidores
          </Button>
        </div>
      </div>

      {isLoadingReadings ? (
        <div className="text-center p-8 text-token-text-tertiary">
          Cargando datos de medidores...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <MeterHistory />
        </div>
      )}

      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${isFormOpen ? "bg-black/50" : "bg-transparent pointer-events-none"}`}
        onClick={() => setIsFormOpen(false)}
      >
        <div
          className={`fixed top-0 right-0 h-full w-full max-w-lg bg-token-surface-card shadow-xl transform transition-transform duration-300 ${isFormOpen ? "translate-x-0" : "translate-x-full"}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center p-4 border-b border-token-border-subtle shrink-0">
              <h2 className="text-xl font-semibold text-token-text-primary">
                Ingresar Nuevas Lecturas
              </h2>
              <Button
                onClick={() => setIsFormOpen(false)}
                variant="secondary"
                size="sm"
                className="p-1 !bg-transparent hover:!bg-token-surface-active"
              >
                <CloseIcon className="w-5 h-5 text-token-text-secondary" />
              </Button>
            </div>
            <div className="overflow-y-auto flex-grow">
              <MeterForm onSaveSuccess={() => setIsFormOpen(false)} />
            </div>
          </div>
        </div>
      </div>

      <MeterConfigPanel isOpen={isConfigPanelOpen} onClose={() => setIsConfigPanelOpen(false)} />
    </div>
  );
};
