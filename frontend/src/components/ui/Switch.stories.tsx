import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./Switch";

const meta = {
  id: "certified-components-ui-switch",
  title: "Design System/components/ui/Switch",
  component: StoryComponent,
  args: { checked: true, onChange: () => undefined, label: "Activar alertas" },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/Switch.tsx" } },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
