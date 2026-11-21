import React from "react";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import CinematicModal from "../../../components/ui/CinematicModal";
import ConfirmationModal from "../../../components/ui/ConfirmationModal";
import Container from "../../../components/ui/Container";
import Input from "../../../components/ui/Input";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import Switch from "../../../components/ui/Switch";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  DeleteIcon,
  EditIcon,
  ExclamationTriangleIcon,
  PlusCircleIcon,
} from "../../../components/ui/icons/index";
import type {
  ScheduledReportFrequency,
  ScheduledReportType,
  ScheduledReportsController,
} from "../hooks/useScheduledReportsController";

const REPORT_TYPE_LABELS: Record<ScheduledReportType, string> = {
  attendance_summary: "Resumen de Asistencia",
  overtime: "Horas Extras",
  anomalies: "Anomalías",
  shift_coverage: "Cobertura de Turnos",
  calendar: "Calendario de Turnos",
  detailed: "Detalle de Asistencia",
  shift_report: "Reporte de Turno",
};

const FREQUENCY_LABELS: Record<ScheduledReportFrequency, string> = {
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual",
};

const formatRunDate = (iso: string | null): string => {
  if (!iso) return "Sin registro";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const ScheduledReportsView: React.FC<ScheduledReportsController> = ({
  reports,
  isLoading,
  loadError,
  isFormOpen,
  editingReport,
  formValues,
  formError,
  getError,
  isSaving,
  formProps,
  togglingId,
  reportToDelete,
  isDeleting,
  loadReports,
  openCreateModal,
  openEditModal,
  closeFormModal,
  handleFieldChange,
  handleToggle,
  setReportToDelete,
  handleConfirmDelete,
}) => {
  return (
    <Container variant="standard" noPadding className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-[11px] font-bold text-token-text-primary uppercase tracking-[0.2em] flex items-center gap-2">
            <CalendarDaysIcon className="w-4 h-4 text-(--sidebar-text-active)" />
            Reportes Programados
          </h3>
          <p className="text-xxs font-bold text-token-text-tertiary uppercase tracking-widest mt-1">
            AUTOMATIZACIÓN DE ENVÍOS POR CORREO
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={loadReports}
            loading={isLoading}
            disabled={isLoading}
            className="h-10 px-4 bg-token-surface-card border-token-border-technical hover:bg-token-surface-active rounded-sm"
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            <span className="text-[11px] font-bold uppercase tracking-widest">Actualizar</span>
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={openCreateModal}
            className="h-10 px-4 bg-(--sidebar-text-active) text-white rounded-sm border-none"
          >
            <PlusCircleIcon className="w-4 h-4 mr-2" />
            <span className="text-[11px] font-bold uppercase tracking-widest">Nuevo Reporte</span>
          </Button>
        </div>
      </div>

      <Card variant="premium" className="border-token-border-technical overflow-hidden" noPadding>
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-token-text-tertiary">
            <LoadingSpinner size="md" />
            <p className="text-[10px] font-bold uppercase tracking-widest">
              Cargando Reportes Programados
            </p>
          </div>
        ) : loadError ? (
          <div className="p-12 flex flex-col items-center justify-center gap-4 text-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-(--status-error)" />
            <p className="text-xs font-bold text-(--status-error)">{loadError}</p>
            <Button type="button" variant="secondary" onClick={loadReports}>
              Reintentar
            </Button>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-token-text-tertiary">
              No hay reportes programados configurados
            </p>
            <Button type="button" variant="primary" onClick={openCreateModal}>
              Crear primer reporte
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-token-surface-stripe border-b border-token-border-technical text-[10px] font-black uppercase tracking-widest text-token-text-tertiary">
                  <th className="px-6 py-4">Nombre</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Frecuencia / Cron</th>
                  <th className="px-6 py-4">Destinatarios</th>
                  <th className="px-6 py-4">Ejecución</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-token-border-subtle text-xs">
                {reports.map((report) => (
                  <tr
                    key={report.id}
                    className="hover:bg-token-surface-active/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-token-text-primary">{report.name}</div>
                      {report.description && (
                        <div className="text-[11px] text-token-text-tertiary mt-0.5">
                          {report.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="neutral" className="text-[10px] font-bold uppercase">
                        {REPORT_TYPE_LABELS[report.reportType] ?? report.reportType}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-token-text-primary">
                        {FREQUENCY_LABELS[report.frequency] ?? report.frequency}
                      </div>
                      <code className="text-[11px] text-token-text-tertiary">
                        {report.cronExpression}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {report.recipients.map((email) => (
                          <span
                            key={email}
                            className="px-2 py-0.5 rounded bg-token-surface-stripe border border-token-border-subtle text-[11px] text-token-text-secondary"
                          >
                            {email}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[11px] text-token-text-tertiary space-y-1">
                      <div>Última: {formatRunDate(report.lastRunAt)}</div>
                      <div>Próxima: {formatRunDate(report.nextRunAt)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={report.isActive}
                          disabled={togglingId === report.id}
                          aria-label={`Alternar estado de ${report.name}`}
                          onChange={() => handleToggle(report)}
                          size="sm"
                        />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-token-text-secondary">
                          {report.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={`Editar ${report.name}`}
                          onClick={() => openEditModal(report)}
                          className="p-2 rounded-md bg-token-surface-stripe text-token-text-secondary hover:bg-(--sidebar-text-active) hover:text-white transition-colors border border-token-border-subtle"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Eliminar ${report.name}`}
                          onClick={() => setReportToDelete(report)}
                          className="p-2 rounded-md bg-token-status-error/10 text-token-status-error-text hover:bg-token-status-error hover:text-token-text-onAccent transition-colors border border-token-status-error/20"
                        >
                          <DeleteIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CinematicModal
        isOpen={isFormOpen}
        onClose={closeFormModal}
        title={editingReport ? "Editar Reporte Programado" : "Nuevo Reporte Programado"}
        maxWidth="max-w-xl"
      >
        <form {...formProps} className="space-y-4">
          {formError && (
            <div
              role="alert"
              className="p-3 rounded-md bg-token-status-error/10 border border-token-status-error/30 text-token-status-error-text text-xs font-bold"
            >
              {formError}
            </div>
          )}

          <Input
            label="Nombre"
            id="scheduled-report-name"
            value={formValues.name}
            onChange={(e) => handleFieldChange("name", e.target.value)}
            error={getError("name")}
            placeholder="Ej. Resumen Diario de Asistencia"
            required
          />

          <Input
            label="Descripción (Opcional)"
            id="scheduled-report-description"
            value={formValues.description}
            onChange={(e) => handleFieldChange("description", e.target.value)}
            placeholder="Descripción breve del reporte"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="scheduled-report-type"
                className="block text-[10px] font-bold uppercase tracking-widest text-token-text-tertiary mb-1.5"
              >
                Tipo de Reporte
              </label>
              <select
                id="scheduled-report-type"
                value={formValues.reportType}
                onChange={(e) =>
                  handleFieldChange("reportType", e.target.value as ScheduledReportType)
                }
                className="w-full h-11 px-3 rounded-md bg-token-surface-card border border-token-border-technical text-xs font-bold text-token-text-primary focus:ring-1 focus:ring-(--sidebar-text-active) outline-none"
              >
                {(Object.keys(REPORT_TYPE_LABELS) as ScheduledReportType[]).map((type) => (
                  <option key={type} value={type}>
                    {REPORT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="scheduled-report-frequency"
                className="block text-[10px] font-bold uppercase tracking-widest text-token-text-tertiary mb-1.5"
              >
                Frecuencia
              </label>
              <select
                id="scheduled-report-frequency"
                value={formValues.frequency}
                onChange={(e) =>
                  handleFieldChange("frequency", e.target.value as ScheduledReportFrequency)
                }
                className="w-full h-11 px-3 rounded-md bg-token-surface-card border border-token-border-technical text-xs font-bold text-token-text-primary focus:ring-1 focus:ring-(--sidebar-text-active) outline-none"
              >
                {(Object.keys(FREQUENCY_LABELS) as ScheduledReportFrequency[]).map((freq) => (
                  <option key={freq} value={freq}>
                    {FREQUENCY_LABELS[freq]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Expresión Cron (5 campos, horario Chile)"
            id="scheduled-report-cron"
            value={formValues.cronExpression}
            onChange={(e) => handleFieldChange("cronExpression", e.target.value)}
            error={getError("cronExpression")}
            placeholder="0 8 * * *"
            required
          />

          <Input
            label="Destinatarios (separados por coma)"
            id="scheduled-report-recipients"
            value={formValues.recipientsText}
            onChange={(e) => handleFieldChange("recipientsText", e.target.value)}
            error={getError("recipientsText")}
            placeholder="gerencia@empresa.cl, rrhh@empresa.cl"
            required
          />

          {formValues.reportType === "shift_report" && (
            <Input
              label="ID de Reporte de Turno"
              id="scheduled-report-shift-id"
              value={formValues.shiftReportId}
              onChange={(e) => handleFieldChange("shiftReportId", e.target.value)}
              error={getError("shiftReportId")}
              placeholder="UUID del reporte de turno"
              required
            />
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-bold text-token-text-secondary uppercase tracking-wider">
              Reporte Activo
            </span>
            <Switch
              checked={formValues.isActive}
              aria-label="Estado activo del reporte"
              onChange={(val) => handleFieldChange("isActive", val)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-token-border-subtle">
            <Button type="button" variant="secondary" onClick={closeFormModal} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={isSaving} disabled={isSaving}>
              {editingReport ? "Guardar Cambios" : "Crear Reporte"}
            </Button>
          </div>
        </form>
      </CinematicModal>

      <ConfirmationModal
        isOpen={!!reportToDelete}
        onClose={() => !isDeleting && setReportToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Reporte Programado"
        message={`¿Está seguro de eliminar el reporte "${reportToDelete?.name ?? ""}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        confirmVariant="danger"
      />
    </Container>
  );
};
