import type { Meta, StoryObj } from "@storybook/react-vite";
import CinematicModal from "./CinematicModal";

const meta = {
  id: "certified-components-ui-cinematic-modal",
  title: "Design System/components/ui/Cinematic/Modal",
  component: CinematicModal,
  args: {
    isOpen: true,
    onClose: () => undefined,
    title: "Vista previa",
    children: "Contenido del diálogo",
    maxWidth: "max-w-lg",
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "Archivo certificado: src/components/ui/CinematicModal.tsx" },
    },
  },
} satisfies Meta<typeof CinematicModal>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const WideWithoutCloseButton: Story = {
  args: {
    maxWidth: "max-w-3xl",
    showCloseButton: false,
    title: "Confirmación crítica",
    children: "Diálogo ancho sin botón de cierre superior.",
  },
};
