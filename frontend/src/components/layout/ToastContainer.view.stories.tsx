import type { Meta, StoryObj } from "@storybook/react-vite";
import ToastContainer from "./ToastContainer.view";

const meta = {
  id: "certified-components-layout-toast-container",
  title: "Design System/components/layout/Toast/Container",
  component: ToastContainer,
  argTypes: {
    toasts: { control: "object" },
  },
  args: {
    toasts: [
      { id: "toast-success", message: "Cambios guardados correctamente", type: "success" },
      { id: "toast-info", message: "Sincronización en segundo plano", type: "info" },
    ],
    onDismiss: () => undefined,
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Archivo certificado: src/components/layout/ToastContainer.view.tsx",
      },
    },
  },
} satisfies Meta<typeof ToastContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MixedSeverities: Story = {
  args: {
    toasts: [
      { id: "toast-1", message: "Registro actualizado", type: "success" },
      { id: "toast-2", message: "Sesión próxima a expirar", type: "warning" },
      { id: "toast-3", message: "No se pudo completar la operación", type: "error" },
      { id: "toast-4", message: "Nueva notificación disponible", type: "info" },
    ],
  },
};

export const EmptyQueue: Story = {
  args: {
    toasts: [],
  },
};
