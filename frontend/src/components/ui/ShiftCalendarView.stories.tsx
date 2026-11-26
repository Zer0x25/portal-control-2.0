import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ScheduleMap } from "../../hooks/useCalendarData";
import ShiftCalendarView from "./ShiftCalendarView";

const sampleScheduleMap: ScheduleMap = new Map([
  [
    "2026-10-22",
    {
      type: "employee",
      data: {
        scheduleText: "Mañana 08:00 - 17:00",
        isWorkDay: true,
        shiftPatternName: "Mañana",
        startTime: "08:00",
        endTime: "17:00",
        hours: 8,
      },
    },
  ],
  [
    "2026-10-23",
    {
      type: "employee",
      data: {
        scheduleText: "Tarde 14:00 - 22:00",
        isWorkDay: true,
        shiftPatternName: "Tarde",
        startTime: "14:00",
        endTime: "22:00",
        hours: 8,
      },
    },
  ],
  [
    "2026-10-24",
    {
      type: "holiday",
      data: {
        date: "2026-10-24",
        name: "Feriado Regional",
        type: "Regional",
      },
    },
  ],
]);

const meta = {
  id: "certified-components-ui-shift-calendar-view",
  title: "Design System/components/ui/Shift/Calendar/View",
  component: ShiftCalendarView,
  args: {
    viewMode: "month",
    currentDisplayDate: new Date("2026-10-23T12:00:00.000Z"),
    selectedEmployeeId: "emp-001",
    scheduleMap: sampleScheduleMap,
    onDayClick: () => undefined,
  },
  argTypes: {
    viewMode: {
      control: "inline-radio",
      options: ["month", "week"],
    },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Archivo certificado: src/components/ui/ShiftCalendarView.tsx",
      },
    },
  },
} satisfies Meta<typeof ShiftCalendarView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WeekView: Story = {
  args: {
    viewMode: "week",
  },
};
