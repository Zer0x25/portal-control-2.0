import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./CinematicModal";

const meta = {
  id: "certified-components-ui-cinematic-modal",
  title: "Design System/components/ui/Cinematic/Modal",
  component: StoryComponent,
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
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
