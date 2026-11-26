import type { Meta, StoryObj } from "@storybook/react-vite";
import ReportTableMobileSummaryCard from "./ReportTableMobileSummaryCard";

const meta = {
  id: "certified-components-ui-report-table-mobile-summary-card",
  title: "Design System/components/ui/Report/Table/Mobile/Summary/Card",
  component: ReportTableMobileSummaryCard,
  args: {
    stat: {
      employeeId: "emp-001",
      name: "Ana Pérez Morales",
      totalHoursWorked: 162.5,
      totalHoursScheduled: 160,
      differenceHours: 2.5,
      absenceDays: 0,
      tardinessIncidents: 0,
      tardinessMinutes: 0,
      scheduledDays: 20,
      workedDays: 20,
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Archivo certificado: src/components/ui/ReportTableMobileSummaryCard.tsx",
      },
    },
  },
} satisfies Meta<typeof ReportTableMobileSummaryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAnomalies: Story = {
  args: {
    stat: {
      employeeId: "emp-002",
      name: "Luis Soto Vega",
      totalHoursWorked: 153.5,
      totalHoursScheduled: 160,
      differenceHours: -6.5,
      absenceDays: 1,
      tardinessIncidents: 2,
      tardinessMinutes: 25,
      scheduledDays: 20,
      workedDays: 19,
    },
  },
};
