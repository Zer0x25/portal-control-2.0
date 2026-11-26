import type { Meta, StoryObj } from "@storybook/react-vite";
import DatePicker, { DatePickerCalendar } from "./DatePicker";

const meta = {
  id: "certified-components-ui-date-picker",
  title: "Design System/components/ui/Date/Picker",
  component: DatePicker,
  args: {
    value: "2026-10-23",
    onChange: () => undefined,
    label: "Fecha de control",
    placeholder: "Seleccionar fecha",
    disabled: false,
  },
  argTypes: {
    disabled: { control: "boolean" },
  },
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Archivo certificado: src/components/ui/DatePicker.tsx",
      },
    },
  },
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const EmptyPlaceholder: Story = {
  args: {
    value: "",
    label: "Fecha inicial",
    placeholder: "DD/MM/AAAA",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const CalendarGrid: Story = {
  render: () => (
    <div className="w-[320px] rounded-xl border border-token-border-technical bg-token-surface-card shadow-lg overflow-hidden">
      <DatePickerCalendar
        selectedDate={new Date("2026-10-23T12:00:00.000Z")}
        initialMonth={new Date("2026-10-01T12:00:00.000Z")}
        onSelect={() => undefined}
      />
    </div>
  ),
};
