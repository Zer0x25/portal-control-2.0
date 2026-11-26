import type { Meta, StoryObj } from "@storybook/react-vite";
import AddSupplierModal from "./AddSupplierModal.view";

const meta = {
  id: "certified-features-logbook-components-add-supplier-modal",
  title: "Design System/features/logbook/components/Add/Supplier/Modal",
  component: AddSupplierModal,
  args: {
    isOpen: true,
    onClose: () => undefined,
    isEditing: false,
    values: {
      entryType: "provider",
      arrivalMode: "vehicle",
      licensePlate: "AB-CD-12",
      driverName: "Juan Pérez",
      paxCount: 2,
      company: "Transportes Sur",
      reason: "Mantención",
      time: "08:30",
    },
    getError: () => undefined,
    handleEntryTypeChange: () => undefined,
    handleArrivalModeChange: () => undefined,
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
    formProps: {
      id: "supplier-story",
      noValidate: true,
      onSubmit: () => undefined,
      "data-app-form": "storybook",
    },
  },
  argTypes: {
    isOpen: { control: "boolean" },
    isEditing: { control: "boolean" },
    isTimePickerOpen: { control: "boolean" },
    isSubmitting: { control: "boolean" },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Archivo certificado: src/features/logbook/components/AddSupplierModal.view.tsx",
      },
    },
  },
} satisfies Meta<typeof AddSupplierModal>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const PedestrianVisitor: Story = {
  args: {
    isEditing: true,
    values: {
      entryType: "visit",
      arrivalMode: "pedestrian",
      licensePlate: "",
      driverName: "María González",
      paxCount: 0,
      company: "Inspección Externa",
      reason: "Auditoría de seguridad",
      time: "10:15",
    },
  },
};

export const Submitting: Story = {
  args: {
    isSubmitting: true,
  },
};
