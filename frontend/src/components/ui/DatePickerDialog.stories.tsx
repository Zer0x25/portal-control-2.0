import type { Meta, StoryObj } from "@storybook/react-vite";
import DatePickerDialog from "./DatePickerDialog";

const meta = {
  id: "certified-components-ui-date-picker-dialog",
  title: "Design System/components/ui/Date/Picker/Dialog",
  component: DatePickerDialog,
  args: {
    isOpen: true,
    onClose: () => undefined,
    onSelect: () => undefined,
    initialDate: "2026-10-23",
  },
  argTypes: {
    isOpen: { control: "boolean" },
    initialDate: { control: "text" },
    minDate: { control: "text" },
    maxDate: { control: "text" },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "Archivo certificado: src/components/ui/DatePickerDialog.tsx" },
    },
  },
} satisfies Meta<typeof DatePickerDialog>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const ConstrainedRange: Story = {
  args: {
    minDate: "2026-10-10",
    maxDate: "2026-10-28",
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
  },
};
