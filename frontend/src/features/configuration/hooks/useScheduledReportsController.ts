import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { useAppForm } from "../../../hooks/useAppForm";
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

const scheduledReportFormSchema = z
  .object({
    name: z.string(),
    description: z.string(),
    reportType: z.enum([
      "attendance_summary",
      "overtime",
      "anomalies",
      "shift_coverage",
      "calendar",
      "detailed",
      "shift_report",
    ]),
    frequency: z.enum(["daily", "weekly", "monthly"]),
    cronExpression: z.string(),
    recipientsText: z.string(),
    shiftReportId: z.string(),
    isActive: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (!values.name.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["name"],
        message: "El nombre del reporte es obligatorio.",
      });
    }

    if (!cronRegex.test(values.cronExpression.trim())) {
      ctx.addIssue({
        code: "custom",
        path: ["cronExpression"],
        message: "La expresión cron debe tener 5 campos (ej. 0 8 * * *).",
      });
    }

    const recipients = values.recipientsText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (recipients.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["recipientsText"],
        message: "Debe ingresar al menos un destinatario válido.",
      });
    } else {
      for (const recipient of recipients) {
        if (!emailSchema.safeParse(recipient).success) {
          ctx.addIssue({
            code: "custom",
            path: ["recipientsText"],
            message: `Correo destinatario inválido: ${recipient}`,
          });
          break;
        }
      }
    }

    if (values.reportType === "shift_report" && !values.shiftReportId.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["shiftReportId"],
        message: "El tipo 'Reporte de Turno' requiere indicar un ID de reporte de turno.",
      });
    }
  });

const buildScheduledReportPayload = (values: ScheduledReportFormValues): ScheduledReportInput => {
  const name = values.name.trim();
  const description = values.description.trim();
  const cronExpression = values.cronExpression.trim();
  const recipients = values.recipientsText
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const shiftReportId = values.shiftReportId.trim();

  return {
    name,
    ...(description ? { description } : {}),
    reportType: values.reportType,
    frequency: values.frequency,
    cronExpression,
    recipients,
    ...(values.reportType === "shift_report" ? { filters: { shiftReportId } } : {}),
    isActive: values.isActive,
  };
};

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
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  const form = useAppForm<ScheduledReportFormValues, ScheduledReportInput>({
    schema: scheduledReportFormSchema,
    defaultValues: EMPTY_FORM,
    normalize: (values) => values,
    serialize: buildScheduledReportPayload,
    onSubmit: async (payload) => {
      setSubmitError(null);
      try {
        if (editingReport) {
          await scheduledReportService.update(editingReport.id, payload);
          addToast("Reporte programado actualizado correctamente.", "success");
        } else {
          await scheduledReportService.create(payload);
          addToast("Reporte programado creado correctamente.", "success");
        }
        setIsFormOpen(false);
        setEditingReport(null);
        await loadReports();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "No se pudo guardar el reporte programado.";
        setSubmitError(message);
        addToast(message, "error");
      }
    },
  });

  const openCreateModal = () => {
    setEditingReport(null);
    form.reset(EMPTY_FORM);
    setSubmitError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (report: ScheduledReport) => {
    setEditingReport(report);
    form.reset({
      name: report.name,
      description: report.description ?? "",
      reportType: report.reportType,
      frequency: report.frequency,
      cronExpression: report.cronExpression,
      recipientsText: report.recipients.join(", "),
      shiftReportId: report.filters?.shiftReportId ?? "",
      isActive: report.isActive,
    });
    setSubmitError(null);
    setIsFormOpen(true);
  };

  const closeFormModal = useCallback(() => {
    if (form.isSubmitting) return;
    setIsFormOpen(false);
    setEditingReport(null);
    setSubmitError(null);
  }, [form.isSubmitting]);

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
    form.setValue(field, value);
    if (field === "frequency" && !editingReport) {
      const freq = value as ScheduledReportFrequency;
      if (Object.values(DEFAULT_CRON_BY_FREQUENCY).includes(form.values.cronExpression)) {
        form.setValue("cronExpression", DEFAULT_CRON_BY_FREQUENCY[freq]);
      }
    }
    setSubmitError(null);
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
    formValues: form.values,
    formError: submitError ?? form.formError ?? null,
    getError: form.getError,
    isSaving: form.isSubmitting,
    formProps: form.formProps,
    submit: form.submit,
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
  };
};

export type ScheduledReportsController = ReturnType<typeof useScheduledReportsController>;
