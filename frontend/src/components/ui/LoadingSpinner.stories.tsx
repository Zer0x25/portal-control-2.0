import type { Meta, StoryObj } from "@storybook/react-vite";
import LoadingSpinner from "./LoadingSpinner";

const meta = {
  id: "certified-components-ui-loading-spinner",
  title: "Design System/components/ui/Loading/Spinner",
  component: LoadingSpinner,
  args: { size: "md", variant: "default", label: "Cargando" },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "Archivo certificado: src/components/ui/LoadingSpinner.tsx" },
    },
  },
} satisfies Meta<typeof LoadingSpinner>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const SmallSubtle: Story = {
  args: {
    size: "sm",
    variant: "subtle",
    label: undefined,
  },
};
export const Large: Story = {
  args: {
    size: "lg",
    variant: "default",
    label: "Sincronizando datos",
  },
};
