import type { Meta, StoryObj } from "@storybook/react-vite";
import ShiftHandoverModal from "./ShiftHandoverModal";

const meta = {
  id: "certified-features-time-control-components-shift-handover-modal",
  title: "Design System/features/time-control/components/Shift/Handover/Modal",
  component: ShiftHandoverModal,
  args: { isOpen: false, onClose: () => undefined, data: null },
  argTypes: {
    isOpen: { control: "boolean" },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Archivo certificado: src/features/time-control/components/ShiftHandoverModal.tsx",
      },
    },
  },
} satisfies Meta<typeof ShiftHandoverModal>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const WithHandoverSummary: Story = {
  args: {
    isOpen: true,
    data: {
      responsibleUser: "Ana Pérez",
      endTime: "2026-10-23T08:00:00Z",
      automaticClosures: [
        {
          id: "auto-1",
          time: "07:55",
          annotation: "Cierre automático aplicado por término de jornada.",
          timestamp: 1792742100000,
        },
      ],
      logEntries: [
        {
          id: "log-1",
          time: "06:30",
          annotation: "Control de acceso operando con normalidad.",
          timestamp: 1792737000000,
        },
      ],
    },
  },
};
