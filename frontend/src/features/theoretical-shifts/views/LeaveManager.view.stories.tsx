import type { Meta, StoryObj } from "@storybook/react-vite";
import { createRef } from "react";
import { LeaveManagerView } from "./LeaveManager.view";

const meta = {
  id: "certified-features-theoretical-shifts-views-leave-manager",
  title: "Design System/features/theoretical-shifts/views/Leave/Manager",
  component: LeaveManagerView,
  args: {
    showArchived: false,
    filterType: "",
    filterEmployeeName: "",
    fetchNextPage: () => undefined,
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    isError: false,
    error: null,
    refetch: () => undefined,
    processedLeaves: [],
    isFormVisible: false,
    editingLeave: null,
    leaveToDelete: null,
    formValues: {
      employeeId: "",
      type: "Vacaciones",
      startDate: "2026-10-24",
      endDate: "2026-10-25",
      notes: "",
    },
    getError: () => undefined,
    setValue: () => undefined,
    isStartDatePickerOpen: false,
    isEndDatePickerOpen: false,
    searchTerm: "",
    isDropdownOpen: false,
    searchContainerRef: createRef<HTMLDivElement>(),
    filteredEmployeesForSearch: [],
    isSubmitting: false,
    formProps: {
      id: "leave-story",
      noValidate: true,
      onSubmit: () => undefined,
      "data-app-form": "storybook",
    },
    setShowArchived: () => undefined,
    setFilterType: () => undefined,
    setFilterEmployeeName: () => undefined,
    setIsFormVisible: () => undefined,
    setLeaveToDelete: () => undefined,
    setIsStartDatePickerOpen: () => undefined,
    setIsEndDatePickerOpen: () => undefined,
    setIsDropdownOpen: () => undefined,
    resetForm: () => undefined,
    handleEditClick: () => undefined,
    handleSearchChange: () => undefined,
    handleSelectEmployee: () => undefined,
    handleClearFilter: () => undefined,
    handleConfirmDeleteLeave: async () => undefined,
  },
  argTypes: {
    showArchived: { control: "boolean" },
    isLoading: { control: "boolean" },
    isError: { control: "boolean" },
    isFormVisible: { control: "boolean" },
    isSubmitting: { control: "boolean" },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Archivo certificado: src/features/theoretical-shifts/views/LeaveManager.view.tsx",
      },
    },
  },
} satisfies Meta<typeof LeaveManagerView>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const FormVisible: Story = {
  args: {
    isFormVisible: true,
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};

export const ErrorState: Story = {
  args: {
    isError: true,
    error: new Error("No fue posible cargar los permisos."),
  },
};
