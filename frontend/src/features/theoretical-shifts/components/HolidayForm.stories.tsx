import type { Meta, StoryObj } from "@storybook/react-vite";
import HolidayForm from "./HolidayForm";

const meta = {
  id: "certified-features-theoretical-shifts-components-holiday-form",
  title: "Design System/features/theoretical-shifts/components/Holiday/Form",
  component: HolidayForm,
  args: {
    values: { date: "2026-12-25", name: "Navidad", type: "Nacional", isRenounceable: false },
    getError: () => undefined,
    setValue: () => undefined,
    formProps: {
      id: "holiday-story",
      noValidate: true,
      onSubmit: () => undefined,
      "data-app-form": "storybook",
    },
    isSubmitting: false,
    isDatePickerOpen: false,
    onOpenDatePicker: () => undefined,
    onCloseDatePicker: () => undefined,
    onCancel: () => undefined,
  },
  argTypes: {
    isSubmitting: { control: "boolean" },
    isDatePickerOpen: { control: "boolean" },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Archivo certificado: src/features/theoretical-shifts/components/HolidayForm.tsx",
      },
    },
  },
} satisfies Meta<typeof HolidayForm>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const IrrenunciableSubmitting: Story = {
  args: {
    isSubmitting: true,
    values: {
      date: "2026-09-18",
      name: "Fiestas Patrias",
      type: "Nacional",
      isRenounceable: true,
    },
  },
};
