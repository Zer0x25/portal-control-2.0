import type { Meta, StoryObj } from "@storybook/react-vite";
import AddNoveltyModal from "./AddNoveltyModal.view";

const meta = {
  id: "certified-features-logbook-components-add-novelty-modal",
  title: "Design System/features/logbook/components/Add/Novelty/Modal",
  component: AddNoveltyModal,
  args: {
    isOpen: true,
    onClose: () => undefined,
    isEditing: false,
    values: { annotation: "Entrega de turno realizada", time: "08:30" },
    getError: () => undefined,
    handleAnnotationChange: () => undefined,
    handleTimeChange: () => undefined,
    isTimePickerOpen: false,
    openTimePicker: () => undefined,
    closeTimePicker: () => undefined,
    isSubmitting: false,
    formProps: {
      id: "novelty-story",
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
        component: "Archivo certificado: src/features/logbook/components/AddNoveltyModal.view.tsx",
      },
    },
  },
} satisfies Meta<typeof AddNoveltyModal>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const EditingEntry: Story = {
  args: {
    isEditing: true,
    values: { annotation: "Relevo sin novedades críticas", time: "20:00" },
  },
};

export const SubmittingWithError: Story = {
  args: {
    isSubmitting: true,
    getError: (field?: string) =>
      field === "annotation" ? "La anotación no puede estar vacía." : undefined,
  },
};
