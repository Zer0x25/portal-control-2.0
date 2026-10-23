import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./PatternForm";

const meta = {
  id: "certified-features-theoretical-shifts-components-pattern-form",
  title: "Design System/features/theoretical-shifts/components/Pattern/Form",
  component: StoryComponent,
  args: {
    onCancel: () => undefined,
    patternForm: {
      editingPattern: null,
      setEditingPattern: () => undefined,
      values: {
        name: "Turno diurno",
        cycleLengthDays: 1,
        startDayOfWeek: 1,
        dailySchedules: [
          {
            dayIndex: 0,
            startTime: "08:00",
            endTime: "17:00",
            isOffDay: false,
            hasColacion: true,
            colacionMinutes: 60,
            hours: 8,
          },
        ],
        color: "blue",
        maxHoursPattern: 40,
        worksOnHolidays: false,
      },
      errors: {},
      getError: () => undefined,
      setValue: () => undefined,
      setCycleLength: () => undefined,
      handleDailyScheduleChange: () => undefined,
      copiedDailySchedule: null,
      handleCopyDailySchedule: () => undefined,
      handlePasteDailySchedule: () => undefined,
      calculatedPatternWeeklyHours: 40,
      globalMaxWeeklyHours: 45,
      isSubmitting: false,
      formProps: {
        id: "pattern-story",
        noValidate: true,
        onSubmit: () => undefined,
        "data-app-form": "storybook",
      },
    },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Archivo certificado: src/features/theoretical-shifts/components/PatternForm.tsx",
      },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
