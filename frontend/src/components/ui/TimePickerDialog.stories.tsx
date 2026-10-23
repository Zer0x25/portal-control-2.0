import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./TimePickerDialog";

const meta = {
  id: "certified-components-ui-time-picker-dialog",
  title: "Design System/components/ui/Time/Picker/Dialog",
  component: StoryComponent,
  args: {
    isOpen: true,
    onClose: () => undefined,
    onSave: () => undefined,
    initialTime: "08:30",
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "Archivo certificado: src/components/ui/TimePickerDialog.tsx" },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
