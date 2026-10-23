import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./AnomalyResolutionModal";

const meta = {
  id: "certified-features-time-control-components-anomaly-resolution-modal",
  title: "Design System/features/time-control/components/Anomaly/Resolution/Modal",
  component: StoryComponent,
  args: {
    isOpen: true,
    onClose: () => undefined,
    record: {
      id: "record-01",
      employeeId: "employee-01",
      employeeName: "Ana Pérez",
      employeePosition: "Operadora",
      employeeArea: "Operaciones",
      employeeWorkdayType: "Full Time",
      date: "2026-10-23",
      status: "AnomaliaManual",
      lastModified: 0,
      syncStatus: "synced",
      isDeleted: false,
      scheduleInfo: null,
    },
    onEdit: () => undefined,
    onResolve: async () => undefined,
    isProcessing: false,
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Archivo certificado: src/features/time-control/components/AnomalyResolutionModal.tsx",
      },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
