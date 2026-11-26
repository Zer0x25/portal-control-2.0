import type { Meta, StoryObj } from "@storybook/react-vite";
import NumericKeypad from "./NumericKeypad";

const meta = {
  id: "certified-components-ui-numeric-keypad",
  title: "Design System/components/ui/Numeric/Keypad",
  component: NumericKeypad,
  args: {
    onInput: () => undefined,
    onDelete: () => undefined,
    onConfirm: () => undefined,
  },
  argTypes: {
    showConfirm: { control: "boolean" },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "Archivo certificado: src/components/ui/NumericKeypad.tsx" },
    },
  },
} satisfies Meta<typeof NumericKeypad>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const WithoutConfirmButton: Story = {
  args: {
    showConfirm: false,
  },
};
