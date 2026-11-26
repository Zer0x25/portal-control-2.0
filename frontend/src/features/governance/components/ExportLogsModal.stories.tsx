import type { Meta, StoryObj } from "@storybook/react-vite";
import ExportLogsModal from "./ExportLogsModal";

const meta = {
  id: "certified-features-governance-components-export-logs-modal",
  title: "Design System/features/governance/components/Export/Logs/Modal",
  component: ExportLogsModal,
  args: { isOpen: false, onClose: () => undefined },
  argTypes: {
    isOpen: { control: "boolean" },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Archivo certificado: src/features/governance/components/ExportLogsModal.tsx",
      },
    },
  },
} satisfies Meta<typeof ExportLogsModal>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const OpenDialog: Story = {
  args: {
    isOpen: true,
  },
};
