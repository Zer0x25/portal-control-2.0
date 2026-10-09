/* UI-PROTECTED: EDIT ONLY WITH HUMAN APPROVAL
   Presentational layer for Master Data Export feature.
*/

import React from "react";
import Card from "../../../components/ui/Card";
import Container from "../../../components/ui/Container";
import {
  DocumentArrowDownIcon,
  CodeBracketSquareIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
} from "../../../components/ui/icons/index";
import DatePickerDialog from "../../../components/ui/DatePickerDialog";
import Button from "../../../components/ui/Button";
import { formatBusinessDate } from "../../../utils/dateUtils";

type ExportFormat = "csv" | "xml";

export interface MasterDataExportViewProps {
  startDate: string;
  endDate: string;
  isStartDatePickerOpen: boolean;
  isEndDatePickerOpen: boolean;
  exporting: false | ExportFormat;
  todayStr: string;
  setEndDate: React.Dispatch<React.SetStateAction<string>>;
  setIsStartDatePickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsEndDatePickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleStartDateChange: (date: string) => void;
  handleExport: (format: ExportFormat) => Promise<void>;
}

export const MasterDataExportView: React.FC<MasterDataExportViewProps> = ({
  startDate,
  endDate,
  isStartDatePickerOpen,
  isEndDatePickerOpen,
  exporting,
  todayStr,
  setEndDate,
  setIsStartDatePickerOpen,
  setIsEndDatePickerOpen,
  handleStartDateChange,
  handleExport,
}) => {
  return (
    <Container variant="standard" noPadding data-ui-protected className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-bold text-token-text-primary uppercase tracking-[0.2em] flex items-center gap-2">
          <DocumentArrowDownIcon className="w-4 h-4 text-(--sidebar-text-active)" />
          Módulo de Exportación
        </h3>
        <div className="flex items-center gap-3 bg-token-surface-card px-4 py-2 rounded-sm border border-token-border-technical shadow-sm">
          <div className="w-2 h-2 rounded-full bg-(--status-success) animate-pulse" />
          <span className="text-[10px] font-bold text-token-text-secondary uppercase tracking-widest">
            Server: Online
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <Card variant="premium" className="p-8 border-token-border-technical">
            <div className="flex items-center gap-3 border-b border-token-border-technical pb-6 mb-8">
              <div className="w-1.5 h-6 bg-(--sidebar-text-active) rounded-full"></div>
              <h2 className="text-[12px] font-bold uppercase tracking-[0.2em] text-token-text-primary">
                Configuración del Periodo
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-token-surface-stripe rounded-sm border border-token-border-technical">
                    <CalendarDaysIcon className="w-5 h-5 text-token-text-tertiary" />
                  </div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-token-text-secondary">
                    Fecha de Inicio
                  </label>
                </div>
                <Button
                  type="button"
                  variant="none"
                  onClick={() => setIsStartDatePickerOpen(true)}
                  className="w-full px-4 py-3 bg-token-surface-card border border-token-border-technical rounded-md focus:ring-2 focus:ring-sap-blue outline-none transition-all text-token-text-primary text-left flex justify-between items-center text-sm cursor-pointer hover:bg-token-surface-hover"
                >
                  <span className="font-medium text-token-text-primary">
                    {startDate ? formatBusinessDate(startDate) : "Seleccionar"}
                  </span>
                  <ChevronRightIcon className="w-4 h-4 text-sap-blue rotate-90 opacity-40" />
                </Button>
                <DatePickerDialog
                  isOpen={isStartDatePickerOpen}
                  onClose={() => setIsStartDatePickerOpen(false)}
                  onSelect={handleStartDateChange}
                  initialDate={startDate}
                  maxDate={todayStr}
                />
                <p className="text-[9px] font-bold text-token-text-tertiary uppercase tracking-tight opacity-50 px-1">
                  Límite operativo: registros históricos
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-token-surface-stripe rounded-sm border border-token-border-technical">
                    <CalendarDaysIcon className="w-5 h-5 text-token-text-tertiary" />
                  </div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-token-text-secondary">
                    Fecha de Término
                  </label>
                </div>
                <Button
                  type="button"
                  variant="none"
                  onClick={() => setIsEndDatePickerOpen(true)}
                  className="w-full px-4 py-3 bg-token-surface-card border border-token-border-technical rounded-md focus:ring-2 focus:ring-sap-blue outline-none transition-all text-token-text-primary text-left flex justify-between items-center text-sm cursor-pointer hover:bg-token-surface-hover"
                >
                  <span className="font-medium text-token-text-primary">
                    {endDate ? formatBusinessDate(endDate) : "Seleccionar"}
                  </span>
                  <ChevronRightIcon className="w-4 h-4 text-sap-blue rotate-90 opacity-40" />
                </Button>
                <DatePickerDialog
                  isOpen={isEndDatePickerOpen}
                  onClose={() => setIsEndDatePickerOpen(false)}
                  onSelect={setEndDate}
                  initialDate={endDate}
                  minDate={startDate}
                  maxDate={todayStr}
                />
                <p className="text-[9px] font-bold text-token-text-tertiary uppercase tracking-tight opacity-50 px-1">
                  Se recomienda cierre de mes contable
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-token-border-technical">
              <Button
                variant="primary"
                onClick={() => handleExport("csv")}
                loading={exporting === "csv"}
                disabled={!!exporting}
                className="flex-1 h-14 bg-(--sidebar-text-active) text-white font-bold uppercase text-[11px] tracking-[0.2em] shadow-lg shadow-(--sidebar-text-active)/20 rounded-sm border-none"
              >
                <DocumentTextIcon className="w-5 h-5 mr-3" />
                Planilla Operativa (CSV)
              </Button>

              <Button
                variant="secondary"
                onClick={() => handleExport("xml")}
                loading={exporting === "xml"}
                disabled={!!exporting}
                className="flex-1 h-14 bg-token-surface-card border border-(--sidebar-text-active) text-(--sidebar-text-active) hover:bg-(--sidebar-text-active) hover:text-white font-bold uppercase text-[11px] tracking-[0.2em] transition-all rounded-sm"
              >
                <CodeBracketSquareIcon className="w-5 h-5 mr-3" />
                Integración ERP (XML)
              </Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <Card
            variant="premium"
            className="bg-token-surface-stripe border-token-border-technical p-8 h-full"
          >
            <h3 className="text-sm font-bold text-token-text-primary uppercase tracking-widest border-b border-token-border-technical pb-4 mb-6">
              Información Técnica
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-(--sidebar-text-active) uppercase tracking-[0.2em]">
                  Formato CSV
                </p>
                <p className="text-[11px] font-semibold text-token-text-secondary leading-relaxed">
                  Ideal para análisis manual en Excel. Incluye rut, nombres, horas trabajadas y
                  patrones de turno.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-(--sidebar-text-active) uppercase tracking-[0.2em]">
                  Formato XML
                </p>
                <p className="text-[11px] font-semibold text-token-text-secondary leading-relaxed">
                  Estructura validada para ingesta en sistemas de remuneraciones (Softland/Payroll).
                </p>
              </div>
              <div className="p-4 bg-token-surface-card border border-token-border-technical rounded-sm mt-8">
                <p className="text-[9px] font-bold text-token-text-tertiary uppercase leading-relaxed text-center">
                  Toda extracción de datos es auditada bajo los protocolos del Centro de Control.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Container>
  );
};
