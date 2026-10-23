import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./ConfirmationModal";

const meta = {
  id: "certified-components-ui-confirmation-modal",
  title: "Design System/components/ui/Confirmation/Modal",
  component: StoryComponent,
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
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
