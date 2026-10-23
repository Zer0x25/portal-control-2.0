import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./RecordHistoryModal";

const meta = {
  id: "certified-features-time-control-components-record-history-modal",
  title: "Design System/features/time-control/components/Record/History/Modal",
  component: StoryComponent,
  args: {
    isOpen: true,
    onClose: () => undefined,
    recordId: null,
    employeeName: "Ana Pérez",
    date: "23-10-2026",
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Archivo certificado: src/features/time-control/components/RecordHistoryModal.tsx",
      },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
