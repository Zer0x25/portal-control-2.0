import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./LoadingOverlay";

const meta = {
  id: "certified-components-ui-loading-overlay",
  title: "Design System/components/ui/Loading/Overlay",
  component: StoryComponent,
  args: { message: "Sincronizando datos…", fullScreen: false },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "Archivo certificado: src/components/ui/LoadingOverlay.tsx" },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
