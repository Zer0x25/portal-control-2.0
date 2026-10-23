import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./ShiftCalendarDayCell";

const meta = {
  id: "certified-components-ui-shift-calendar-day-cell",
  title: "Design System/components/ui/Shift/Calendar/Day/Cell",
  component: StoryComponent,
  args: {
    day: new Date("2026-10-23T12:00:00"),
    dayData: undefined,
    isToday: true,
    cellHeightClass: "h-16",
    onDayClick: () => undefined,
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "Archivo certificado: src/components/ui/ShiftCalendarDayCell.tsx" },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
