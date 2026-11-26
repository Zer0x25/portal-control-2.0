import type { Meta, StoryObj } from "@storybook/react-vite";
import Card from "./Card";

const meta = {
  id: "certified-components-ui-card",
  title: "Design System/components/ui/Card",
  component: Card,
  args: { title: "Resumen", children: "Contenido de la tarjeta", variant: "default" },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/Card.tsx" } },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Premium: Story = {
  args: {
    variant: "premium",
    title: "Panel Operativo",
    children: "Contenido con padding amplio para secciones destacadas.",
  },
};
export const Flat: Story = {
  args: {
    variant: "flat",
    title: undefined,
    children: "Contenedor plano sin borde ni sombra.",
  },
};
