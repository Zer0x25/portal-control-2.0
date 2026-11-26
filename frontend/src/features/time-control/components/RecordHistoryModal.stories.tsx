import type { Meta, StoryObj } from "@storybook/react-vite";
import RecordHistoryModal from "./RecordHistoryModal";

const meta = {
  id: "certified-features-time-control-components-record-history-modal",
  title: "Design System/features/time-control/components/Record/History/Modal",
  component: RecordHistoryModal,
  args: {
    isOpen: true,
    onClose: () => undefined,
    recordId: null,
    employeeName: "Ana Pérez",
    date: "23-10-2026",
  },
  argTypes: {
    isOpen: { control: "boolean" },
    employeeName: { control: "text" },
    date: { control: "text" },
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
} satisfies Meta<typeof RecordHistoryModal>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const Closed: Story = {
  args: {
    isOpen: false,
  },
};
