import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./ToastItem";

const meta = {
  id: "certified-components-ui-toast-item",
  title: "Design System/components/ui/Toast/Item",
  component: StoryComponent,
  args: {
    toast: { id: "storybook-toast", message: "Cambios guardados", type: "success" },
    onDismiss: () => undefined,
  },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/ToastItem.tsx" } },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
