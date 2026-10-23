import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./HolidayForm";

const meta = {
  id: "certified-features-theoretical-shifts-components-holiday-form",
  title: "Design System/features/theoretical-shifts/components/Holiday/Form",
  component: StoryComponent,
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
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Archivo certificado: src/features/theoretical-shifts/components/HolidayForm.tsx",
      },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
