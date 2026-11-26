import type { Meta, StoryObj } from "@storybook/react-vite";
import SeedingOptionsModal from "./SeedingOptionsModal.view";

const meta = {
  id: "certified-features-configuration-components-seeding-options-modal",
  title: "Design System/features/configuration/components/Seeding/Options/Modal",
  component: SeedingOptionsModal,
  args: {
    isOpen: true,
    onClose: () => undefined,
    values: {
      employees: 15,
      days: 30,
      basePatternsCount: 3,
      leaveRatio: 5,
      correctionRequestRatio: 2,
      shiftReportsPerDay: 1,
      quickNotesCount: 10,
    },
    getError: () => undefined,
    handleNumberChange: () => undefined,
    applyQuickSeedPreset: () => undefined,
    applyIncrementalPreset: () => undefined,
    incrementalLevel: 1,
    maxIncrementalLevel: 4,
    isSubmitting: false,
    formProps: {
      id: "seeding-story",
      noValidate: true,
      onSubmit: () => undefined,
      "data-app-form": "storybook",
    },
  },
  argTypes: {
    isOpen: { control: "boolean" },
    isSubmitting: { control: "boolean" },
    incrementalLevel: { control: { type: "number", min: 0, max: 4 } },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Archivo certificado: src/features/configuration/components/SeedingOptionsModal.view.tsx",
      },
    },
  },
} satisfies Meta<typeof SeedingOptionsModal>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const Submitting: Story = {
  args: {
    isSubmitting: true,
    incrementalLevel: 4,
  },
};

export const ValidationError: Story = {
  args: {
    getError: (field?: string) =>
      field === "employees" ? "Ingrese al menos 1 empleado." : undefined,
  },
};
