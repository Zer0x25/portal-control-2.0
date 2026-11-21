import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./ReportTable";

const meta = {
  id: "certified-components-ui-report-table",
  title: "Design System/components/ui/Report/Table",
  component: StoryComponent,
  args: {
    reportData: null,
    isSingleEmployeeReport: false,
    sortConfig: null,
    requestSort: () => undefined,
    currentPage: 1,
    setCurrentPage: () => undefined,
    justificationStyles: {},
  },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/ReportTable.tsx" } },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const SummaryReport: Story = {
  args: {
    isSingleEmployeeReport: false,
    reportData: [
      {
        employeeId: "emp-001",
        name: "Ana Pérez Morales",
        scheduledDays: 20,
        workedDays: 20,
        totalHoursScheduled: 160,
        totalHoursWorked: 162.5,
        differenceHours: 2.5,
        absenceDays: 0,
        tardinessIncidents: 0,
        tardinessMinutes: 0,
      },
      {
        employeeId: "emp-002",
        name: "Luis Soto Vega",
        scheduledDays: 20,
        workedDays: 19,
        totalHoursScheduled: 160,
        totalHoursWorked: 153.5,
        differenceHours: -6.5,
        absenceDays: 1,
        tardinessIncidents: 2,
        tardinessMinutes: 25,
      },
    ],
  },
};

export const DailySingleEmployee: Story = {
  args: {
    isSingleEmployeeReport: true,
    justificationStyles: {
      Feriado: "bg-token-status-warning-surface text-token-status-warning-text",
    },
    reportData: [
      {
        date: "22/10/2026",
        isoDate: "2026-10-22",
        dayOfWeek: "Jueves",
        scheduledShift: "Mañana (08:00 - 17:00)",
        actualClocks: "07:59 - 17:02",
        scheduledHours: 8,
        colacionMinutes: 60,
        workedHours: 8.05,
        differenceHours: 0.05,
      },
      {
        date: "23/10/2026",
        isoDate: "2026-10-23",
        dayOfWeek: "Viernes",
        scheduledShift: "Libre",
        actualClocks: "",
        scheduledHours: 0,
        colacionMinutes: 0,
        workedHours: 0,
        differenceHours: 0,
        justificationType: "Feriado",
      },
    ],
  },
};
