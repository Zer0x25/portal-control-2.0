import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { useToasts } from "../../../hooks/useToasts";
import {
  scheduledReportService,
  type ScheduledReport,
  type ScheduledReportFrequency,
  type ScheduledReportInput,
  type ScheduledReportType,
} from "../../../services/scheduledReportService";

export type { ScheduledReportFrequency, ScheduledReportType };

export interface ScheduledReportFormValues {
  name: string;
  description: string;
  reportType: ScheduledReportType;
  frequency: ScheduledReportFrequency;
  cronExpression: string;
  recipientsText: string;
  shiftReportId: string;
  isActive: boolean;
}

const DEFAULT_CRON_BY_FREQUENCY: Record<ScheduledReportFrequency, string> = {
  daily: "0 8 * * *",
  weekly: "0 8 * * 1",
  monthly: "0 8 1 * *",
};

const EMPTY_FORM: ScheduledReportFormValues = {
  name: "",
  description: "",
  reportType: "attendance_summary",
  frequency: "daily",
  cronExpression: DEFAULT_CRON_BY_FREQUENCY.daily,
  recipientsText: "",
  shiftReportId: "",
  isActive: true,
};

const cronRegex = /^(\S+\s+){4}\S+$/;
const emailSchema = z.string().trim().email();

export const validateScheduledReportForm = (
  values: ScheduledReportFormValues,
): { valid: true; payload: ScheduledReportInput } | { valid: false; message: string } => {
  const name = values.name.trim();
  if (!name) {
    return { valid: false, message: "El nombre del reporte es obligatorio." };
  }

  const cronExpression = values.cronExpression.trim();
  if (!cronRegex.test(cronExpression)) {
    return {
      valid: false,
      message: "La expresión cron debe tener 5 campos (ej. 0 8 * * *).",
    };
  }

  const recipients = values.recipientsText
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    return { valid: false, message: "Debe ingresar al menos un destinatario válido." };
  }

  for (const recipient of recipients) {
    if (!emailSchema.safeParse(recipient).success) {
      return { valid: false, message: `Correo destinatario inválido: ${recipient}` };
    }
  }

  const shiftReportId = values.shiftReportId.trim();
  if (values.reportType === "shift_report" && !shiftReportId) {
    return {
      valid: false,
      message: "El tipo 'Reporte de Turno' requiere indicar un ID de reporte de turno.",
    };
  }

  const description = values.description.trim();
  const payload: ScheduledReportInput = {
    name,
    ...(description ? { description } : {}),
    reportType: values.reportType,
    frequency: values.frequency,
    cronExpression,
    recipients,
    ...(values.reportType === "shift_report" ? { filters: { shiftReportId } } : {}),
    isActive: values.isActive,
  };

  return { valid: true, payload };
};

export const useScheduledReportsController = () => {
  const { addToast } = useToasts();
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null);
  const [formValues, setFormValues] = useState<ScheduledReportFormValues>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [reportToDelete, setReportToDelete] = useState<ScheduledReport | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await scheduledReportService.getAll();
      setReports(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudieron cargar los reportes programados.";
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const openCreateModal = () => {
    setEditingReport(null);
    setFormValues(EMPTY_FORM);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (report: ScheduledReport) => {
    setEditingReport(report);
    setFormValues({
      name: report.name,
      description: report.description ?? "",
      reportType: report.reportType,
      frequency: report.frequency,
      cronExpression: report.cronExpression,
      recipientsText: report.recipients.join(", "),
      shiftReportId: report.filters?.shiftReportId ?? "",
      isActive: report.isActive,
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const closeFormModal = useCallback(() => {
    if (isSaving) return;
    setIsFormOpen(false);
    setEditingReport(null);
    setFormError(null);
  }, [isSaving]);

  useEffect(() => {
    if (!isFormOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeFormModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFormOpen, closeFormModal]);

  const handleFieldChange = <K extends keyof ScheduledReportFormValues>(
    field: K,
    value: ScheduledReportFormValues[K],
  ) => {
    setFormValues((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "frequency" && !editingReport) {
        const freq = value as ScheduledReportFrequency;
        if (Object.values(DEFAULT_CRON_BY_FREQUENCY).includes(prev.cronExpression)) {
          next.cronExpression = DEFAULT_CRON_BY_FREQUENCY[freq];
        }
      }
      return next;
    });
    setFormError(null);
  };

  const handleSave = async (event?: { preventDefault: () => void }) => {
    event?.preventDefault();
    const validation = validateScheduledReportForm(formValues);
    if (validation.valid === false) {
      setFormError(validation.message);
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      if (editingReport) {
        await scheduledReportService.update(editingReport.id, validation.payload);
        addToast("Reporte programado actualizado correctamente.", "success");
      } else {
        await scheduledReportService.create(validation.payload);
        addToast("Reporte programado creado correctamente.", "success");
      }
      setIsFormOpen(false);
      setEditingReport(null);
      await loadReports();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar el reporte programado.";
      setFormError(message);
      addToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (report: ScheduledReport) => {
    setTogglingId(report.id);
    try {
      await scheduledReportService.toggle(report.id);
      addToast(
        `Reporte "${report.name}" ${report.isActive ? "desactivado" : "activado"}.`,
        "success",
      );
      await loadReports();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo cambiar el estado del reporte.";
      addToast(message, "error");
    } finally {
      setTogglingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!reportToDelete) return;
    setIsDeleting(true);
    try {
      await scheduledReportService.remove(reportToDelete.id);
      addToast("Reporte programado eliminado.", "success");
      setReportToDelete(null);
      await loadReports();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo eliminar el reporte programado.";
      addToast(message, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    reports,
    isLoading,
    loadError,
    isFormOpen,
    editingReport,
    formValues,
    formError,
    isSaving,
    togglingId,
    reportToDelete,
    isDeleting,
    loadReports,
    openCreateModal,
    openEditModal,
    closeFormModal,
    handleFieldChange,
    handleSave,
    handleToggle,
    setReportToDelete,
    handleConfirmDelete,
  };
};

export type ScheduledReportsController = ReturnType<typeof useScheduledReportsController>;
