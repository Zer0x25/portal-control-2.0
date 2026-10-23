import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./EmptyState";

const meta = {
  id: "certified-components-ui-empty-state",
  title: "Design System/components/ui/Empty/State",
  component: StoryComponent,
  args: { title: "Sin resultados", description: "Prueba con otros filtros." },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/EmptyState.tsx" } },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
