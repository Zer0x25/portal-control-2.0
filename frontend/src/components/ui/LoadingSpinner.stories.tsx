import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./LoadingSpinner";

const meta = {
  id: "certified-components-ui-loading-spinner",
  title: "Design System/components/ui/Loading/Spinner",
  component: StoryComponent,
  args: { size: "md", variant: "default", label: "Cargando" },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "Archivo certificado: src/components/ui/LoadingSpinner.tsx" },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
