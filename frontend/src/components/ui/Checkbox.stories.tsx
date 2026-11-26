import type { Meta, StoryObj } from "@storybook/react-vite";
import Checkbox from "./Checkbox";

const meta = {
  id: "certified-components-ui-checkbox",
  title: "Design System/components/ui/Checkbox",
  component: Checkbox,
  args: { label: "Recibir notificaciones", checked: true },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/Checkbox.tsx" } },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Unchecked: Story = {
  args: {
    checked: false,
  },
};
export const WithError: Story = {
  args: {
    checked: false,
    error: "Debes aceptar este requisito",
  },
};
export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
