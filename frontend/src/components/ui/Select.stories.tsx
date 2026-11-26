import type { Meta, StoryObj } from "@storybook/react-vite";
import Select from "./Select";

const meta = {
  id: "certified-components-ui-select",
  title: "Design System/components/ui/Select",
  component: Select,
  args: {
    label: "Área",
    value: "operaciones",
    options: [
      { value: "operaciones", label: "Operaciones" },
      { value: "mantencion", label: "Mantención" },
    ],
  },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/Select.tsx" } },
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const WithError: Story = {
  args: {
    error: "Selecciona un área válida",
  },
};
export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
