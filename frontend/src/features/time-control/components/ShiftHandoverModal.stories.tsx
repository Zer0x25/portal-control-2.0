import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./ShiftHandoverModal";

const meta = {
  id: "certified-features-time-control-components-shift-handover-modal",
  title: "Design System/features/time-control/components/Shift/Handover/Modal",
  component: StoryComponent,
  args: { isOpen: false, onClose: () => undefined, data: null },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Archivo certificado: src/features/time-control/components/ShiftHandoverModal.tsx",
      },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
