import type { Meta, StoryObj } from "@storybook/react-vite";
import ToastItem from "./ToastItem";

const meta = {
  id: "certified-components-ui-toast-item",
  title: "Design System/components/ui/Toast/Item",
  component: ToastItem,
  args: {
    toast: { id: "storybook-toast", message: "Cambios guardados", type: "success" },
    onDismiss: () => undefined,
  },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/ToastItem.tsx" } },
  },
} satisfies Meta<typeof ToastItem>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const ErrorToast: Story = {
  args: {
    toast: {
      id: "storybook-toast-error",
      message: "No se pudo guardar el registro",
      type: "error",
    },
  },
};
export const WarningToast: Story = {
  args: {
    toast: { id: "storybook-toast-warning", message: "Sesión próxima a expirar", type: "warning" },
  },
};
export const InfoToast: Story = {
  args: {
    toast: { id: "storybook-toast-info", message: "Sincronización en curso", type: "info" },
  },
};
