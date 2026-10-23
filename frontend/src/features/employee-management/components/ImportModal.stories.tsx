import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./ImportModal";

const meta = {
  id: "certified-features-employee-management-components-import-modal",
  title: "Design System/features/employee-management/components/Import/Modal",
  component: StoryComponent,
  args: {
    isOpen: true,
    onClose: () => undefined,
    onImport: async () => true,
    title: "Importar personal",
    schema: { name: { prop: "name", type: String, required: true } },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Archivo certificado: src/features/employee-management/components/ImportModal.tsx",
      },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
