import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./DatePickerDialog";

const meta = {
  id: "certified-components-ui-date-picker-dialog",
  title: "Design System/components/ui/Date/Picker/Dialog",
  component: StoryComponent,
  args: {
    isOpen: true,
    onClose: () => undefined,
    onSelect: () => undefined,
    initialDate: "2026-10-23",
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "Archivo certificado: src/components/ui/DatePickerDialog.tsx" },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
