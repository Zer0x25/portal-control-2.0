import type { Meta, StoryObj } from "@storybook/react-vite";
import UserManualModal from "./UserManualModal";

const meta = {
  id: "certified-components-ui-user-manual-modal",
  title: "Design System/components/ui/User/Manual/Modal",
  component: UserManualModal,
  args: { isOpen: true, onClose: () => undefined },
  argTypes: {
    isOpen: { control: "boolean" },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "Archivo certificado: src/components/ui/UserManualModal.tsx" },
    },
  },
} satisfies Meta<typeof UserManualModal>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const Closed: Story = {
  args: {
    isOpen: false,
  },
};
