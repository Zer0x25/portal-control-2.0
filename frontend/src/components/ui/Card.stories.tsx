import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./Card";

const meta = {
  id: "certified-components-ui-card",
  title: "Design System/components/ui/Card",
  component: StoryComponent,
  args: { title: "Resumen", children: "Contenido de la tarjeta", variant: "default" },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/Card.tsx" } },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
