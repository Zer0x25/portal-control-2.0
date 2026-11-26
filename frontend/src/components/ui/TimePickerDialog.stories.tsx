import type { Meta, StoryObj } from "@storybook/react-vite";
import TimePickerDialog from "./TimePickerDialog";

const meta = {
  id: "certified-components-ui-time-picker-dialog",
  title: "Design System/components/ui/Time/Picker/Dialog",
  component: TimePickerDialog,
  args: {
    isOpen: true,
    onClose: () => undefined,
    onSave: () => undefined,
    initialTime: "08:30",
  },
  argTypes: {
    isOpen: { control: "boolean" },
    initialTime: { control: "text" },
    accentColor: {
      control: "inline-radio",
      options: ["token-accent-brand", "emerald"],
    },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "Archivo certificado: src/components/ui/TimePickerDialog.tsx" },
    },
  },
} satisfies Meta<typeof TimePickerDialog>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const EmeraldAccent: Story = {
  args: {
    initialTime: "14:45",
    accentColor: "emerald",
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
  },
};
