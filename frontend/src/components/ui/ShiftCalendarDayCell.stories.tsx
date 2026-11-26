import type { Meta, StoryObj } from "@storybook/react-vite";
import ShiftCalendarDayCell from "./ShiftCalendarDayCell";

const meta = {
  id: "certified-components-ui-shift-calendar-day-cell",
  title: "Design System/components/ui/Shift/Calendar/Day/Cell",
  component: ShiftCalendarDayCell,
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
} satisfies Meta<typeof ShiftCalendarDayCell>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const WorkDayShift: Story = {
  args: {
    isToday: false,
    cellHeightClass: "h-24",
    dayData: {
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
  },
};

export const HolidayCell: Story = {
  args: {
    isToday: false,
    cellHeightClass: "h-24",
    dayData: {
      type: "holiday",
      data: {
        date: "2026-10-23",
        name: "Feriado Regional",
        type: "Regional",
      },
    },
  },
};

export const GroupSchedule: Story = {
  args: {
    isToday: false,
    cellHeightClass: "h-24",
    dayData: {
      type: "group",
      data: [
        {
          employeeId: "emp-1",
          employeeName: "Ana Pérez",
          shiftPatternName: "Mañana",
          startTime: "08:00",
          endTime: "17:00",
          patternColor: "#005792",
        },
        {
          employeeId: "emp-2",
          employeeName: "Luis Soto",
          shiftPatternName: "Tarde",
          startTime: "14:00",
          endTime: "22:00",
          patternColor: "#0f766e",
        },
      ],
    },
  },
};
