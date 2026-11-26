import type { Meta, StoryObj } from "@storybook/react-vite";
import CalendarMonthSelector from "./CalendarMonthSelector";

const meta = {
  id: "certified-components-ui-calendar-month-selector",
  title: "Design System/components/ui/Calendar/Month/Selector",
  component: CalendarMonthSelector,
  args: {
    currentDate: new Date("2026-10-23T12:00:00.000Z"),
    onChange: () => undefined,
    viewMode: "month",
    isLoading: false,
  },
  argTypes: {
    viewMode: {
      control: "inline-radio",
      options: ["month", "week", "day"],
    },
    isLoading: { control: "boolean" },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Archivo certificado: src/components/ui/CalendarMonthSelector.tsx",
      },
    },
  },
} satisfies Meta<typeof CalendarMonthSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WeekMode: Story = {
  args: {
    viewMode: "week",
    label: "Semana 43 · 2026",
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};
