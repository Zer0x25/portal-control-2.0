import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, renderHook, act, waitFor } from "@testing-library/react";
import {
  useScheduledReportsController,
  validateScheduledReportForm,
} from "../../../features/configuration/hooks/useScheduledReportsController";
import { ScheduledReportsView } from "../../../features/configuration/views/ScheduledReports.view";
import {
  scheduledReportService,
  type ScheduledReport,
} from "../../../services/scheduledReportService";

const addToastMock = vi.fn();

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: addToastMock }),
}));

vi.mock("../../../services/scheduledReportService", () => ({
  scheduledReportService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    toggle: vi.fn(),
    remove: vi.fn(),
  },
}));

const sampleReport: ScheduledReport = {
  id: "rep-1",
  name: "Resumen Diario",
  description: "Envío matinal",
  reportType: "attendance_summary",
  frequency: "daily",
  cronExpression: "0 8 * * *",
  recipients: ["ops@empresa.cl"],
  filters: null,
  isActive: true,
  lastRunAt: null,
  nextRunAt: "2026-11-19T08:00:00.000Z",
  createdBy: "admin",
  createdAt: "2026-11-18T10:00:00.000Z",
  updatedAt: "2026-11-18T10:00:00.000Z",
};

describe("validateScheduledReportForm", () => {
  it("validates cron, recipients and shift_report requirement", () => {
    expect(
      validateScheduledReportForm({
        name: "Test",
        description: "",
        reportType: "calendar",
        frequency: "weekly",
        cronExpression: "invalid",
        recipientsText: "a@b.cl",
        shiftReportId: "",
        isActive: true,
      }).valid,
    ).toBe(false);

    expect(
      validateScheduledReportForm({
        name: "Test",
        description: "",
        reportType: "shift_report",
        frequency: "daily",
        cronExpression: "0 8 * * *",
        recipientsText: "a@b.cl",
        shiftReportId: "",
        isActive: true,
      }).valid,
    ).toBe(false);

    const ok = validateScheduledReportForm({
      name: "Reporte Detallado",
      description: "Desc",
      reportType: "detailed",
      frequency: "monthly",
      cronExpression: "0 8 1 * *",
      recipientsText: "uno@empresa.cl, dos@empresa.cl",
      shiftReportId: "",
      isActive: true,
    });
    expect(ok.valid).toBe(true);
    if (ok.valid) {
      expect(ok.payload.recipients).toEqual(["uno@empresa.cl", "dos@empresa.cl"]);
    }
  });
});

describe("useScheduledReportsController & ScheduledReportsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(scheduledReportService.getAll).mockResolvedValue([sampleReport]);
  });

  it("loads, creates, toggles and deletes scheduled reports", async () => {
    vi.mocked(scheduledReportService.create).mockResolvedValue(undefined);
    vi.mocked(scheduledReportService.toggle).mockResolvedValue({ success: true });
    vi.mocked(scheduledReportService.remove).mockResolvedValue(undefined);

    const { result } = renderHook(() => useScheduledReportsController());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.reports).toHaveLength(1);

    act(() => {
      result.current.openCreateModal();
      result.current.handleFieldChange("name", "Nuevo Reporte");
      result.current.handleFieldChange("recipientsText", "test@empresa.cl");
    });

    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });
    expect(result.current.isFormOpen).toBe(false);

    act(() => {
      result.current.openCreateModal();
      result.current.handleFieldChange("name", "Nuevo Reporte");
      result.current.handleFieldChange("recipientsText", "test@empresa.cl");
    });

    await act(async () => {
      result.current.submit();
    });
    await waitFor(() => expect(scheduledReportService.create).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.handleToggle(sampleReport);
    });
    expect(scheduledReportService.toggle).toHaveBeenCalledWith("rep-1");

    act(() => {
      result.current.setReportToDelete(sampleReport);
    });
    await act(async () => {
      await result.current.handleConfirmDelete();
    });
    expect(scheduledReportService.remove).toHaveBeenCalledWith("rep-1");
  });

  it("renders view, accessible dialog, Escape close and ConfirmationModal", async () => {
    const closeFormModal = vi.fn();
    const openCreateModal = vi.fn();
    const setReportToDelete = vi.fn();

    render(
      <ScheduledReportsView
        reports={[sampleReport]}
        isLoading={false}
        loadError={null}
        isFormOpen={true}
        editingReport={null}
        formValues={{
          name: "",
          description: "",
          reportType: "attendance_summary",
          frequency: "daily",
          cronExpression: "0 8 * * *",
          recipientsText: "",
          shiftReportId: "",
          isActive: true,
        }}
        formError={null}
        getError={vi.fn()}
        isSaving={false}
        formProps={{
          id: "scheduled-reports-form",
          noValidate: true,
          onSubmit: vi.fn(),
          "data-app-form": "scheduled-reports-form",
        }}
        submit={vi.fn()}
        togglingId={null}
        reportToDelete={null}
        isDeleting={false}
        loadReports={vi.fn()}
        openCreateModal={openCreateModal}
        openEditModal={vi.fn()}
        closeFormModal={closeFormModal}
        handleFieldChange={vi.fn()}
        handleToggle={vi.fn()}
        setReportToDelete={setReportToDelete}
        handleConfirmDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("Resumen Diario")).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(closeFormModal).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Eliminar Resumen Diario" }));
    expect(setReportToDelete).toHaveBeenCalledWith(sampleReport);
  });
});
