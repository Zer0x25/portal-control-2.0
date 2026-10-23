import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./ExportLogsModal";

const meta = {
  id: "certified-features-governance-components-export-logs-modal",
  title: "Design System/features/governance/components/Export/Logs/Modal",
  component: StoryComponent,
  args: { isOpen: false, onClose: () => undefined },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Archivo certificado: src/features/governance/components/ExportLogsModal.tsx",
      },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
