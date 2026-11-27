import React, { useState, useEffect } from "react";
import { UpcomingEmployeeStatus, MissingClockOutStatus } from "../../../types/index";
import Card from "../../../components/ui/Card";
import DashboardRow from "../components/DashboardRow";

interface AlertsPanelProps {
  upcomingEmployees: UpcomingEmployeeStatus[];
  missingClockOuts: MissingClockOutStatus[];
  openClockInConfirmation: (employeeStatus: UpcomingEmployeeStatus) => void;
  onMissingClockOutDoubleClick: (item: MissingClockOutStatus) => void;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  upcomingEmployees,
  missingClockOuts,
  openClockInConfirmation,
  onMissingClockOutDoubleClick,
}) => {
  const [activeAlertTab, setActiveAlertTab] = useState<"upcoming" | "missing">("upcoming");

  useEffect(() => {
    const hasUpcomingAlerts = upcomingEmployees.length > 0;
    const hasMissingAlerts = missingClockOuts.length > 0;

    let intervalId: number | undefined;

    if (hasUpcomingAlerts && hasMissingAlerts) {
      intervalId = window.setInterval(() => {
        setActiveAlertTab((prev) => (prev === "upcoming" ? "missing" : "upcoming"));
      }, 10000);
    } else if (hasMissingAlerts) {
      setActiveAlertTab("missing");
    } else {
      setActiveAlertTab("upcoming");
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [upcomingEmployees.length, missingClockOuts.length]);

  return (
    <Card headingAs="h2" title="Gestión de Alertas">
      <div className="flex bg-token-surface-stripe p-1 rounded-sm border border-token-border-technical mb-4">
        <button
          type="button"
          aria-pressed={activeAlertTab === "upcoming"}
          onClick={() => setActiveAlertTab("upcoming")}
          className={`flex-1 py-2 text-[11px] font-semibold uppercase tracking-wider rounded-sm transition-all ${
            activeAlertTab === "upcoming"
              ? "bg-token-surface-card shadow-sm text-token-accent-brand border border-token-border-technical"
              : "text-token-text-tertiary hover:text-token-text-secondary"
          }`}
        >
          Ingresos ({upcomingEmployees.length})
        </button>
        <button
          type="button"
          aria-pressed={activeAlertTab === "missing"}
          onClick={() => setActiveAlertTab("missing")}
          className={`flex-1 py-2 text-[11px] font-semibold uppercase tracking-wider rounded-sm transition-all relative ${
            activeAlertTab === "missing"
              ? "bg-token-surface-card shadow-sm text-token-accent-brand border border-token-border-technical"
              : "text-token-text-tertiary hover:text-token-text-secondary"
          }`}
        >
          Salidas ({missingClockOuts.length})
          {missingClockOuts.some((m) => m.status === "late") && (
            <span className="absolute top-1.5 right-2 w-1.5 h-1.5 bg-token-status-error rounded-full border border-token-surface-card"></span>
          )}
        </button>
      </div>

      <div
        // Región scrollable accesible por teclado (WCAG 2.1): patrón
        // sancionado, no es un elemento interactivo.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        role="region"
        aria-label="Alertas operativas"
        className="space-y-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar px-1 focus:outline-hidden"
      >
        {activeAlertTab === "upcoming" ? (
          upcomingEmployees.length > 0 ? (
            upcomingEmployees.map((status) => (
              <DashboardRow
                key={status.employee.id}
                initial={status.employee.name.charAt(0)}
                title={status.employee.name}
                subtitle={`Turno ${status.shiftStartTime.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}`}
                indicator={
                  <div
                    className={`px-2.5 py-1 rounded-sm text-[11px] font-semibold uppercase tracking-wider border shadow-sm ${
                      status.status === "ontime"
                        ? "text-token-status-success-text border-token-status-success/20 bg-token-status-success/5"
                        : status.status === "late_warn"
                          ? "text-token-status-warning-text border-token-status-warning/20 bg-token-status-warning/5"
                          : "text-token-status-error-text border-token-status-error/20 bg-token-status-error/5"
                    }`}
                  >
                    {status.statusText}
                  </div>
                }
                onDoubleClick={() => openClockInConfirmation(status)}
              />
            ))
          ) : (
            <div className="py-12 text-center bg-token-surface-stripe rounded-sm border border-token-border-technical">
              <p className="text-xxs font-black text-token-text-tertiary uppercase tracking-[0.2em]">
                Sin ingresos programados
              </p>
            </div>
          )
        ) : missingClockOuts.length > 0 ? (
          missingClockOuts.map((item) => (
            <DashboardRow
              key={item.employee.id}
              initial={item.employee.name.charAt(0)}
              title={item.employee.name}
              subtitle={`Salida: ${item.shiftEndTime}`}
              indicator={
                <div
                  className={`px-2.5 py-1 rounded-sm text-[11px] font-semibold uppercase tracking-wider border shadow-sm ${
                    item.status === "upcoming"
                      ? "text-token-status-warning-text border-token-status-warning/20 bg-token-status-warning/5"
                      : "text-token-status-error-text border-token-status-error/20 bg-token-status-error/5"
                  }`}
                >
                  {item.status === "upcoming"
                    ? `Faltan ${Math.abs(item.timeDifferenceMinutes)} min`
                    : `${item.timeDifferenceMinutes} min retraso`}
                </div>
              }
              onDoubleClick={() => onMissingClockOutDoubleClick(item)}
            />
          ))
        ) : (
          <div className="py-12 text-center bg-token-surface-stripe rounded-sm border border-token-border-technical">
            <p className="text-xxs font-black text-token-text-tertiary uppercase tracking-[0.2em]">
              Sin salidas pendientes
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};
