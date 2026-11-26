import type { Meta, StoryObj } from "@storybook/react-vite";
import ConfirmationModal from "./ConfirmationModal";

const meta = {
  id: "certified-components-ui-confirmation-modal",
  title: "Design System/components/ui/Confirmation/Modal",
  component: ConfirmationModal,
  args: {
    isOpen: true,
    onClose: () => undefined,
    onConfirm: () => undefined,
    title: "Confirmar acción",
    message: "¿Deseas continuar con esta operación?",
    confirmText: "Continuar",
    cancelText: "Volver",
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "Archivo certificado: src/components/ui/ConfirmationModal.tsx" },
    },
  },
} satisfies Meta<typeof ConfirmationModal>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const PrimaryAction: Story = {
  args: {
    confirmVariant: "primary",
    title: "Publicar cambios",
    message: "¿Deseas aplicar la nueva configuración?",
    confirmText: "Publicar",
  },
};
export const SecondaryAction: Story = {
  args: {
    confirmVariant: "secondary",
    title: "Guardar borrador",
    message: "Se guardará el estado actual sin enviarlo.",
    confirmText: "Guardar",
  },
};
