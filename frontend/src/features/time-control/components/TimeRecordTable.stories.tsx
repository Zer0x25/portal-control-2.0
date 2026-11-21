import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./TimeRecordTable";

const meta = {
  id: "certified-features-time-control-components-time-record-table",
  title: "Design System/features/time-control/components/Time/Record/Table",
  component: StoryComponent,
  args: {
    records: [],
    fetchNextPage: () => undefined,
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    onRowDoubleClick: () => undefined,
    onAddComment: () => undefined,
    onDelete: () => undefined,
    isActionDisabledForRole: false,
    roleBasedTooltip: "",
    accountingLockDate: null,
    isControlInternoEnabled: true,
    searchName: "",
    onSearchChange: () => undefined,
    onExportStreaming: () => undefined,
    onViewHistory: () => undefined,
  },
  argTypes: {
    isLoading: { control: "boolean" },
    isFetchingNextPage: { control: "boolean" },
    hasNextPage: { control: "boolean" },
    isActionDisabledForRole: { control: "boolean" },
    searchName: { control: "text" },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Archivo certificado: src/features/time-control/components/TimeRecordTable.tsx",
      },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const Populated: Story = {
  args: {
    records: [
      {
        id: "rec-1",
        employeeId: "emp-1",
        employeeName: "Ana Pérez",
        employeePosition: "Operadora",
        employeeArea: "Operaciones",
        employeeWorkdayType: "Full Time",
        date: "2026-10-23",
        entrada: "2026-10-23T08:00:00Z",
        inicioColacion: "2026-10-23T13:00:00Z",
        finColacion: "2026-10-23T14:00:00Z",
        salida: "2026-10-23T18:00:00Z",
        status: "Completado",
        workedHours: 9,
        overtimeHours: 1,
        scheduledHours: 8,
        isDayOffWorked: false,
        lastModified: 0,
        syncStatus: "synced",
        isDeleted: false,
        scheduleInfo: {
          scheduleText: "08:00 - 18:00",
          isWorkDay: true,
          planningStatus: "Programado",
        },
      },
      {
        id: "rec-2",
        employeeId: "emp-2",
        employeeName: "Carlos Muñoz",
        employeePosition: "Supervisor",
        employeeArea: "Seguridad",
        employeeWorkdayType: "Full Time",
        date: "2026-10-23",
        entrada: "2026-10-23T08:05:00Z",
        status: "Laborando",
        workedHours: 4.5,
        overtimeHours: 0,
        scheduledHours: 8,
        isDayOffWorked: false,
        lastModified: 0,
        syncStatus: "synced",
        isDeleted: false,
        scheduleInfo: {
          scheduleText: "08:00 - 18:00",
          isWorkDay: true,
          planningStatus: "Programado",
        },
      },
    ],
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};
