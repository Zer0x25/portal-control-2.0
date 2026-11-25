import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./FilterSelect";

const meta = {
  id: "certified-components-ui-filterselect",
  title: "Design System/components/ui/FilterSelect",
  component: StoryComponent,
  args: {
    label: "Tipo de Jornada",
    value: "",
    options: [
      { value: "", label: "Todas las Jornadas" },
      { value: "Ordinaria", label: "Ordinaria" },
      { value: "Especial", label: "Especial" },
    ],
  },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/FilterSelect.tsx" } },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithIcon: Story = {
  args: {
    icon: <span aria-hidden="true">⚙</span>,
    value: "Ordinaria",
  },
};
export const WithError: Story = {
  args: {
    error: "Selecciona una jornada válida",
  },
};
export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
