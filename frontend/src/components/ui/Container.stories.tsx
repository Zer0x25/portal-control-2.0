import type { Meta, StoryObj } from "@storybook/react-vite";
import Container from "./Container";

const meta = {
  id: "certified-components-ui-container",
  title: "Design System/components/ui/Container",
  component: Container,
  args: { children: "Contenido alineado", variant: "standard" },
  argTypes: {
    variant: { control: "select", options: ["standard", "wide", "narrow", "fluid"] },
    noPadding: { control: "boolean" },
    withSafeArea: { control: "boolean" },
  },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/Container.tsx" } },
  },
} satisfies Meta<typeof Container>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Narrow: Story = {
  args: { variant: "narrow", children: "Contenedor angosto (max-w-4xl) para formularios." },
};
export const Wide: Story = {
  args: { variant: "wide", children: "Contenedor amplio (1440px) para tableros densos." },
};
export const FluidNoPadding: Story = {
  args: { variant: "fluid", noPadding: true, children: "Contenedor fluido sin padding lateral." },
};
