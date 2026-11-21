import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./Tooltip";

const meta = {
  id: "certified-components-ui-tooltip",
  title: "Design System/components/ui/Tooltip",
  component: StoryComponent,
  args: {
    content: "Detalle de la acción",
    children: <button type="button">Pasa el cursor</button>,
  },
  argTypes: {
    position: { control: "select", options: ["top", "bottom", "left", "right"] },
    content: { control: "text" },
  },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/Tooltip.tsx" } },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const RightPosition: Story = {
  args: {
    position: "right",
    content: "Indicador técnico lateral para botones compactos",
    children: (
      <button type="button" className="px-3 py-1.5 rounded-md border border-token-border-subtle">
        Enfoca o pasa el cursor
      </button>
    ),
  },
};
export const BottomPosition: Story = {
  args: {
    position: "bottom",
    content: "Explicación contextual debajo del control",
    children: (
      <button type="button" className="px-3 py-1.5 rounded-md border border-token-border-subtle">
        Control inferior
      </button>
    ),
  },
};
