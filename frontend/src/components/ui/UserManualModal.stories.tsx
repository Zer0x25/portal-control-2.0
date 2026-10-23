import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./UserManualModal";

const meta = {
  id: "certified-components-ui-user-manual-modal",
  title: "Design System/components/ui/User/Manual/Modal",
  component: StoryComponent,
  args: { isOpen: true, onClose: () => undefined },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "Archivo certificado: src/components/ui/UserManualModal.tsx" },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
