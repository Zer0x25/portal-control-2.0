import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./Container";

const meta = {
  id: "certified-components-ui-container",
  title: "Design System/components/ui/Container",
  component: StoryComponent,
  args: { children: "Contenido alineado", variant: "standard" },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/Container.tsx" } },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
