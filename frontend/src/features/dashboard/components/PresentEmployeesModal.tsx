import React from "react";
import CinematicModal from "../../../components/ui/CinematicModal";
import EmptyState from "../../../components/ui/EmptyState";
import IconBox from "../../../components/ui/IconBox";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import DashboardRow from "./ui/DashboardRow";
import { UsersIcon, ExclamationTriangleIcon } from "../../../components/ui/icons/index";
import { CLOCKING_STATUS_CONFIG } from "../../../utils/mappings";
import type { ClockingStatus, EmployeeWithClockingStatus } from "../../../types";

/**
 * Estados que cuentan como "presente" — mismo criterio que el backend usa
 * para `teamStatus.present` (KpiReportService.getOverview).
 */
const PRESENT_STATUSES: readonly ClockingStatus[] = [
  "en_jornada",
  "en_colacion",
  "en_jornada_post_colacion",
];

interface PresentEmployeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeStatuses: EmployeeWithClockingStatus[];
  /** Detalle en vuelo:.isLoading while fetching the clicked employee's record. */
  isResolvingRecord?: boolean;
  onEmployeeDoubleClick: (employeeId: string, employeeName: string) => void;
}

/**
 * Modal "Personal Presente": lista a los empleados con jornada activa a partir
 * de los `employeeStatuses` del overview. Presentacional puro; los datos los
 * aporta el container (spec 036).
 */
const PresentEmployeesModal: React.FC<PresentEmployeesModalProps> = ({
  isOpen,
  onClose,
  employeeStatuses,
  isResolvingRecord = false,
  onEmployeeDoubleClick,
}) => {
  if (!isOpen) {
    return null;
  }

  const presentEmployees = employeeStatuses.filter(({ status }) =>
    PRESENT_STATUSES.includes(status),
  );

  return (
    <CinematicModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-4">
          <IconBox icon={<UsersIcon />} variant="primary" size="md" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-black text-token-text-primary uppercase italic leading-none">
              Personal Presente
            </h3>
            <p className="text-xxs font-black text-token-text-tertiary uppercase tracking-[0.2em] mt-1.5 italic leading-none">
              {`${presentEmployees.length} de ${employeeStatuses.length} en jornada`}
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {isResolvingRecord && (
          <div
            role="status"
            className="flex items-center justify-center gap-3 p-3 rounded-md bg-token-surface-stripe border border-token-border-subtle"
          >
            <LoadingSpinner size="sm" variant="default" />
            <p className="text-[10px] font-black text-token-text-tertiary uppercase tracking-widest animate-pulse">
              Abriendo gestión de jornada...
            </p>
          </div>
        )}

        {presentEmployees.length > 0 ? (
          <div
            // Región scrollable accesible por teclado (WCAG 2.1): patrón
            // sancionado, no es un elemento interactivo.
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={0}
            role="region"
            aria-label="Personal presente en jornada"
            className="space-y-2 max-h-[55vh] overflow-y-auto pr-1 px-1 custom-scrollbar focus:outline-hidden"
          >
            {presentEmployees.map(({ employee, status }, index) => {
              const config = CLOCKING_STATUS_CONFIG[status];
              return (
                <DashboardRow
                  key={employee.id}
                  initial={employee.name.charAt(0)}
                  title={employee.name}
                  subtitle={employee.position || "Sin Cargo"}
                  indicator={
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border border-black/5 dark:border-white/10 ${config.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                      <span
                        className={`text-xxs font-bold uppercase tracking-widest leading-none ${config.text}`}
                      >
                        {config.label}
                      </span>
                    </div>
                  }
                  onDoubleClick={() => onEmployeeDoubleClick(employee.id, employee.name)}
                  animationDelay={index * 0.04}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<ExclamationTriangleIcon />}
            title="Sin Personal Ingresado"
            description="Ningún empleado tiene una jornada activa en este momento."
          />
        )}

        <p className="text-center text-[10px] font-black text-token-text-tertiary/60 uppercase tracking-widest italic pt-1">
          Doble clic sobre un colaborador para gestionar su jornada
        </p>
      </div>
    </CinematicModal>
  );
};

export default PresentEmployeesModal;
