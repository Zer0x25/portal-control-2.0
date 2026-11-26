import type { Meta, StoryObj } from "@storybook/react-vite";
import ReportTableMobileDailyCard from "./ReportTableMobileDailyCard";

const meta = {
  id: "certified-components-ui-report-table-mobile-daily-card",
  title: "Design System/components/ui/Report/Table/Mobile/Daily/Card",
  component: ReportTableMobileDailyCard,
  args: {
    item: {
      date: "23/10/2026",
      isoDate: "2026-10-23",
      dayOfWeek: "Viernes",
      scheduledShift: "Mañana (08:00 - 17:00)",
      actualClocks: "07:58 - 17:04",
      scheduledHours: 8,
      colacionMinutes: 60,
      workedHours: 8.1,
      differenceHours: 0.1,
    },
    justificationStyles: {
      Vacaciones: "bg-token-status-info-surface text-token-status-info-text",
      Feriado: "bg-token-status-warning-surface text-token-status-warning-text",
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
        component: "Archivo certificado: src/components/ui/ReportTableMobileDailyCard.tsx",
      },
    },
  },
} satisfies Meta<typeof ReportTableMobileDailyCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithJustification: Story = {
  args: {
    item: {
      date: "24/10/2026",
      isoDate: "2026-10-24",
      dayOfWeek: "Sábado",
      scheduledShift: "Libre",
      actualClocks: "",
      scheduledHours: 0,
      colacionMinutes: 0,
      workedHours: 0,
      differenceHours: 0,
      justificationType: "Feriado",
    },
  },
};
