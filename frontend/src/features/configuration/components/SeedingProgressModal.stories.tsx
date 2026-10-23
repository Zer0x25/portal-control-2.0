import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./SeedingProgressModal";

const meta = {
  id: "certified-features-configuration-components-seeding-progress-modal",
  title: "Design System/features/configuration/components/Seeding/Progress/Modal",
  component: StoryComponent,
  args: {
    isOpen: true,
    onClose: () => undefined,
    progressSteps: ["Preparando datos", "Validando registros"],
    isFinished: true,
    error: null,
    seedingOptions: null,
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Archivo certificado: src/features/configuration/components/SeedingProgressModal.tsx",
      },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
