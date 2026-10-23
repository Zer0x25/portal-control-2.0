import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./AddSupplierModal.view";

const meta = {
  id: "certified-features-logbook-components-add-supplier-modal",
  title: "Design System/features/logbook/components/Add/Supplier/Modal",
  component: StoryComponent,
  args: {
    isOpen: true,
    onClose: () => undefined,
    isEditing: false,
    values: {
      licensePlate: "AB-CD-12",
      driverName: "Juan Pérez",
      paxCount: 2,
      company: "Transportes Sur",
      reason: "Mantención",
      time: "08:30",
    },
    getError: () => undefined,
    handleLicensePlateChange: () => undefined,
    handleDriverNameChange: () => undefined,
    handleCompanyChange: () => undefined,
    handleReasonChange: () => undefined,
    handlePaxCountChange: () => undefined,
    handleTimeChange: () => undefined,
    isTimePickerOpen: false,
    openTimePicker: () => undefined,
    closeTimePicker: () => undefined,
    isSubmitting: false,
    submit: () => undefined,
    formProps: {
      id: "supplier-story",
      noValidate: true,
      onSubmit: () => undefined,
      "data-app-form": "storybook",
    },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Archivo certificado: src/features/logbook/components/AddSupplierModal.view.tsx",
      },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
