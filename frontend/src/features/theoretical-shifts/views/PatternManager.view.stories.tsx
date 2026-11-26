import type { Meta, StoryObj } from "@storybook/react-vite";
import { PatternManagerView } from "./PatternManager.view";

const meta = {
  id: "certified-features-theoretical-shifts-views-pattern-manager",
  title: "Design System/features/theoretical-shifts/views/Pattern/Manager",
  component: PatternManagerView,
  args: {
    searchTerm: "",
    fetchNextPage: () => undefined,
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    refetch: () => undefined,
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
        id: "pattern-manager-story",
        noValidate: true,
        onSubmit: () => undefined,
        "data-app-form": "storybook",
      },
    },
    isFormVisible: false,
    patternToDelete: null,
    globalMaxWeeklyHours: 45,
    affectedEmployeesCount: 0,
    processedPatterns: [],
    setSearchTerm: () => undefined,
    setPatternToDelete: () => undefined,
    handleOpenNewForm: () => undefined,
    handleCancelForm: () => undefined,
    handleConfirmDelete: async () => undefined,
    handleEditPattern: () => undefined,
    handleCopyPattern: () => undefined,
  },
  argTypes: {
    isLoading: { control: "boolean" },
    isFormVisible: { control: "boolean" },
    searchTerm: { control: "text" },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Archivo certificado: src/features/theoretical-shifts/views/PatternManager.view.tsx",
      },
    },
  },
} satisfies Meta<typeof PatternManagerView>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const FormOpen: Story = {
  args: {
    isFormVisible: true,
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};
