import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import WizardContainer from "../../../features/planning/components/WizardContainer";

const { addToastMock, getMonthlyPlanMock, getSuggestedPatternNameMock, createMonthlyPlanMock } =
  vi.hoisted(() => ({
    addToastMock: vi.fn(),
    getMonthlyPlanMock: vi.fn(),
    getSuggestedPatternNameMock: vi.fn(),
    createMonthlyPlanMock: vi.fn(),
  }));

vi.mock("../../../hooks/useEmployees", () => ({
  useEmployees: () => ({
    activeEmployees: [
      { id: "emp-1", name: "Ana Pérez", area: "Operaciones", position: "Operador" },
      { id: "emp-2", name: "Luis Soto", area: "Bodega", position: "Supervisor" },
    ],
    isLoadingEmployees: false,
  }),
}));

vi.mock("../../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: addToastMock }),
}));

vi.mock("../../../services/shiftService", () => ({
  shiftService: {
    getMonthlyPlan: getMonthlyPlanMock,
    getSuggestedPatternName: getSuggestedPatternNameMock,
    createMonthlyPlan: createMonthlyPlanMock,
  },
}));

const renderWithQueryClient = (ui: React.ReactElement) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

describe("WizardContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSuggestedPatternNameMock.mockResolvedValue("Plan Mensual Ana Nov 2026");
    getMonthlyPlanMock.mockResolvedValue([
      {
        dateIso: "2026-11-01",
        dayOfWeek: "dom",
        dayOfMonth: 1,
        scheduleText: "Libre",
        isWorkDay: false,
      },
      {
        dateIso: "2026-11-02",
        dayOfWeek: "lun",
        dayOfMonth: 2,
        scheduleText: "08:00 - 17:00",
        isWorkDay: true,
      },
    ]);
    createMonthlyPlanMock.mockResolvedValue(undefined);
  });

  it("loads monthly plan and suggested pattern name when selecting an employee and saves plan", async () => {
    renderWithQueryClient(<WizardContainer />);

    expect(screen.getByText("Seleccione un colaborador")).toBeInTheDocument();

    const employeeSelect = screen.getByLabelText("Colaborador");
    fireEvent.change(employeeSelect, { target: { value: "emp-1" } });

    await waitFor(() => {
      expect(getMonthlyPlanMock).toHaveBeenCalledWith(
        "emp-1",
        expect.any(Number),
        expect.any(Number),
      );
      expect(getSuggestedPatternNameMock).toHaveBeenCalledWith(
        "emp-1",
        expect.any(Number),
        expect.any(Number),
      );
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("Plan Mensual Ana Nov 2026")).toBeInTheDocument();
    });

    const toggleDay1 = screen.getByRole("button", { name: "Cambiar estado día 1" });
    fireEvent.click(toggleDay1);

    const saveButton = screen.getByRole("button", { name: "Guardar Plan Mensual" });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(createMonthlyPlanMock).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: "emp-1",
          patternName: "Plan Mensual Ana Nov 2026",
          dailySchedules: expect.arrayContaining([
            expect.objectContaining({ day: 1, type: "work", startTime: "08:00", endTime: "17:00" }),
            expect.objectContaining({ day: 2, type: "work", startTime: "08:00", endTime: "17:00" }),
          ]),
        }),
      );
    });

    expect(addToastMock).toHaveBeenCalledWith("Plan mensual guardado correctamente.", "success");
  });
});
