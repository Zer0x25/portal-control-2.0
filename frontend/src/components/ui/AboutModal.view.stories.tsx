import type { Meta, StoryObj } from "@storybook/react-vite";
import AboutModal from "./AboutModal.view";

const meta = {
  id: "certified-components-ui-about-modal",
  title: "Design System/components/ui/About/Modal",
  component: AboutModal,
  args: {
    isOpen: true,
    onClose: () => undefined,
    showMonkey: false,
    onCloseMonkey: () => undefined,
    onLogoClick: () => undefined,
  },
  argTypes: {
    isOpen: { control: "boolean" },
    showMonkey: { control: "boolean" },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "Archivo certificado: src/components/ui/AboutModal.view.tsx" },
    },
  },
} satisfies Meta<typeof AboutModal>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const WithEasterEgg: Story = {
  args: {
    showMonkey: true,
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
  },
};
