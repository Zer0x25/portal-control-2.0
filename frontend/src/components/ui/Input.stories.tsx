import type { Meta, StoryObj } from "@storybook/react-vite";
import Input from "./Input";

const meta = {
  id: "certified-components-ui-input",
  title: "Design System/components/ui/Input",
  component: Input,
  args: { label: "Nombre", placeholder: "Escribe un nombre", value: "Ana Pérez" },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/Input.tsx" } },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const WithError: Story = {
  args: {
    value: "",
    placeholder: "Ingresa un nombre válido",
    error: "Este campo es obligatorio",
  },
};
export const Disabled: Story = {
  args: {
    disabled: true,
    value: "Solo lectura",
  },
};
