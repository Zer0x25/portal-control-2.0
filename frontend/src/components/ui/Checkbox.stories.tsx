import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./Checkbox";

const meta = {
  id: "certified-components-ui-checkbox",
  title: "Design System/components/ui/Checkbox",
  component: StoryComponent,
  args: { label: "Recibir notificaciones", checked: true },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/Checkbox.tsx" } },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
