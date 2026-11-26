import type { Meta, StoryObj } from "@storybook/react-vite";
import LoadingOverlay from "./LoadingOverlay";

const meta = {
  id: "certified-components-ui-loading-overlay",
  title: "Design System/components/ui/Loading/Overlay",
  component: LoadingOverlay,
  args: { message: "Sincronizando datos…", fullScreen: false },
  argTypes: {
    message: { control: "text" },
    fullScreen: { control: "boolean" },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "Archivo certificado: src/components/ui/LoadingOverlay.tsx" },
    },
  },
} satisfies Meta<typeof LoadingOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const WithoutMessage: Story = {
  args: {
    message: undefined,
    fullScreen: false,
  },
};

export const FullScreen: Story = {
  args: {
    message: "Cargando módulo seguro…",
    fullScreen: true,
  },
  parameters: {
    docs: { story: { inline: false, iframeHeight: 360 } },
  },
};
