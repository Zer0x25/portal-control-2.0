import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./AddNoveltyModal.view";

const meta = {
  id: "certified-features-logbook-components-add-novelty-modal",
  title: "Design System/features/logbook/components/Add/Novelty/Modal",
  component: StoryComponent,
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
    submit: () => undefined,
    formProps: {
      id: "novelty-story",
      noValidate: true,
      onSubmit: () => undefined,
      "data-app-form": "storybook",
    },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Archivo certificado: src/features/logbook/components/AddNoveltyModal.view.tsx",
      },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
