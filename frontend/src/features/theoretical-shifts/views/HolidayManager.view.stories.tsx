import type { Meta, StoryObj } from "@storybook/react-vite";
import { HolidayManagerView as StoryComponent } from "./HolidayManager.view";

const meta = {
  id: "certified-features-theoretical-shifts-views-holiday-manager",
  title: "Design System/features/theoretical-shifts/views/Holiday/Manager",
  component: StoryComponent,
  args: {
    showArchived: false,
    fetchNextPage: () => undefined,
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    refetch: () => undefined,
    isPending: false,
    isFormVisible: false,
    editingHoliday: null,
    holidayToDelete: null,
    sortedHolidays: [],
    holidays: [],
    formValues: { date: "2026-12-25", name: "Navidad", type: "Nacional", isRenounceable: false },
    getError: () => undefined,
    setValue: () => undefined,
    isDatePickerOpen: false,
    isSubmitting: false,
    formProps: {
      id: "holiday-manager-story",
      noValidate: true,
      onSubmit: () => undefined,
      "data-app-form": "storybook",
    },
    setShowArchived: () => undefined,
    setIsFormVisible: () => undefined,
    setHolidayToDelete: () => undefined,
    setIsDatePickerOpen: () => undefined,
    handleCancelForm: () => undefined,
    handleEditClick: () => undefined,
    handleLoadHolidays: async () => undefined,
    handleConfirmDeleteHoliday: async () => undefined,
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Archivo certificado: src/features/theoretical-shifts/views/HolidayManager.view.tsx",
      },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
