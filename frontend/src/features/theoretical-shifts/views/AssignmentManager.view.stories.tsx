import type { Meta, StoryObj } from "@storybook/react-vite";
import { createRef } from "react";
import { AssignmentManagerView } from "./AssignmentManager.view";

const meta = {
  id: "certified-features-theoretical-shifts-views-assignment-manager",
  title: "Design System/features/theoretical-shifts/views/Assignment/Manager",
  component: AssignmentManagerView,
  args: {
    shiftPatterns: [],
    assignmentForm: {
      editingAssignment: null,
      setEditingAssignment: () => undefined,
      values: { employeeId: "", shiftPatternId: "", startDate: "2026-10-23", endDate: null },
      errors: {},
      getError: () => undefined,
      setValue: () => undefined,
      clearForm: () => undefined,
      isConflictModalOpen: false,
      setIsConflictModalOpen: () => undefined,
      proceedWithSave: async () => true,
      resolutionMode: "OVERLAP",
      conflictingAssignment: null,
      isSubmitting: false,
      formProps: {
        id: "assignment-story",
        noValidate: true,
        onSubmit: () => undefined,
        "data-app-form": "storybook",
      },
    },
    searchTerm: "",
    showArchived: false,
    fetchNextPage: () => undefined,
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    isError: false,
    error: null,
    refetch: () => undefined,
    flatAssignments: [],
    filteredAssignments: [],
    isMobile: false,
    isFormVisible: false,
    conflictingAssignmentIds: new Set<string>(),
    isStartDatePickerOpen: false,
    isEndDatePickerOpen: false,
    employeeSearchTerm: "",
    isEmployeeDropdownOpen: false,
    employeeSearchRef: createRef<HTMLDivElement>(),
    filteredEmployeesForSearch: [],
    isDeleteModalOpen: false,
    assignmentToDelete: null,
    terminationMode: "DELETE",
    todayStr: "2026-10-23",
    setSearchTerm: () => undefined,
    setShowArchived: () => undefined,
    setIsStartDatePickerOpen: () => undefined,
    setIsEndDatePickerOpen: () => undefined,
    setEmployeeSearchTerm: () => undefined,
    setIsEmployeeDropdownOpen: () => undefined,
    handleOpenNewForm: () => undefined,
    handleCancelForm: () => undefined,
    handleEditAssignment: () => undefined,
    handleDeleteClick: () => undefined,
    handleConfirmDelete: async () => undefined,
    handleCancelDelete: () => undefined,
    handleConfirmConflict: async () => undefined,
    addBusinessDaysChile: (date: string) => date,
    formatBusinessDate: (date: string) => date,
  },
  argTypes: {
    showArchived: { control: "boolean" },
    isLoading: { control: "boolean" },
    isError: { control: "boolean" },
    isFormVisible: { control: "boolean" },
    isMobile: { control: "boolean" },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Archivo certificado: src/features/theoretical-shifts/views/AssignmentManager.view.tsx",
      },
    },
  },
} satisfies Meta<typeof AssignmentManagerView>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};

export const ErrorState: Story = {
  args: {
    isError: true,
    error: new Error("Error cargando asignaciones."),
  },
};

export const MobileLayout: Story = {
  args: {
    isMobile: true,
  },
};
