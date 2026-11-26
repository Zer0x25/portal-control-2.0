import type { Meta, StoryObj } from "@storybook/react-vite";
import ImportModal from "./ImportModal";

const meta = {
  id: "certified-features-employee-management-components-import-modal",
  title: "Design System/features/employee-management/components/Import/Modal",
  component: ImportModal,
  args: {
    isOpen: true,
    onClose: () => undefined,
    onImport: async () => true,
    title: "Importar personal",
    schema: { name: { prop: "name", type: String, required: true } },
  },
  argTypes: {
    isOpen: { control: "boolean" },
    title: { control: "text" },
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
} satisfies Meta<typeof ImportModal>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const ShiftImport: Story = {
  args: {
    title: "Importar planificación mensual",
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
  },
};
