import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./NumericKeypad";

const meta = {
  id: "certified-components-ui-numeric-keypad",
  title: "Design System/components/ui/Numeric/Keypad",
  component: StoryComponent,
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
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const WithoutConfirmButton: Story = {
  args: {
    showConfirm: false,
  },
};
