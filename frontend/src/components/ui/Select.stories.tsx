import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./Select";

const meta = {
  id: "certified-components-ui-select",
  title: "Design System/components/ui/Select",
  component: StoryComponent,
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
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
