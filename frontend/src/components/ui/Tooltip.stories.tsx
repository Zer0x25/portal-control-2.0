import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./Tooltip";

const meta = {
  id: "certified-components-ui-tooltip",
  title: "Design System/components/ui/Tooltip",
  component: StoryComponent,
  args: { content: "Detalle de la acción", children: "Pasa el cursor" },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/Tooltip.tsx" } },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
