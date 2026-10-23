import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./ClosedReportsModal";

const meta = {
  id: "certified-features-logbook-components-closed-reports-modal",
  title: "Design System/features/logbook/components/Closed/Reports/Modal",
  component: StoryComponent,
  args: {
    isOpen: true,
    onClose: () => undefined,
    onDownloadPDF: () => undefined,
    onExportExcel: () => undefined,
    onPreview: () => undefined,
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Archivo certificado: src/features/logbook/components/ClosedReportsModal.tsx",
      },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
