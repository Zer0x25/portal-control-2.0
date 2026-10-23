import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./AboutModal.view";

const meta = {
  id: "certified-components-ui-about-modal",
  title: "Design System/components/ui/About/Modal",
  component: StoryComponent,
  args: {
    isOpen: true,
    onClose: () => undefined,
    showMonkey: false,
    onCloseMonkey: () => undefined,
    onLogoClick: () => undefined,
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "Archivo certificado: src/components/ui/AboutModal.view.tsx" },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
