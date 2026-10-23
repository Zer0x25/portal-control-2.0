import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./ShiftHistoryModal";

const meta = {
  id: "certified-features-employee-management-components-shift-history-modal",
  title: "Design System/features/employee-management/components/Shift/History/Modal",
  component: StoryComponent,
  args: {
    isOpen: false,
    onClose: () => undefined,
    employeeId: "employee-01",
    employeeName: "Ana Pérez",
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Archivo certificado: src/features/employee-management/components/ShiftHistoryModal.tsx",
      },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
