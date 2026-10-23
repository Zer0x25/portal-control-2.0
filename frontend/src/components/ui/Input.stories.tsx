import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./Input";

const meta = {
  id: "certified-components-ui-input",
  title: "Design System/components/ui/Input",
  component: StoryComponent,
  args: { label: "Nombre", placeholder: "Escribe un nombre", value: "Ana Pérez" },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/Input.tsx" } },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
