#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const prettier = require("prettier");

const frontendRoot = path.resolve(__dirname, "..");
const certified = JSON.parse(
  fs.readFileSync(path.join(frontendRoot, "design-system-certified.json"), "utf8"),
);

const namedExports = {
  "src/components/ui/PasswordChangeForm.tsx": "PasswordChangeForm",
  "src/features/theoretical-shifts/views/AssignmentManager.view.tsx": "AssignmentManagerView",
  "src/features/theoretical-shifts/views/HolidayManager.view.tsx": "HolidayManagerView",
  "src/features/theoretical-shifts/views/LeaveManager.view.tsx": "LeaveManagerView",
  "src/features/theoretical-shifts/views/PatternManager.view.tsx": "PatternManagerView",
};

const extraImports = {
  "src/components/layout/Header.view.tsx": 'import { createRef } from "react";\n',
  "src/components/layout/NotificationCenter.view.tsx": 'import { createRef } from "react";\n',
  "src/features/theoretical-shifts/views/AssignmentManager.view.tsx": 'import { createRef } from "react";\n',
  "src/features/theoretical-shifts/views/LeaveManager.view.tsx": 'import { createRef } from "react";\n',
  "src/components/layout/SidebarNavItem.tsx":
    'import { HomeIcon } from "../ui/icons/index";\n',
  "src/components/ui/IconBox.tsx": 'import { CheckCircleIcon } from "./icons/index";\n',
};

const argsByPath = {
  "src/components/ErrorBoundary.tsx": '{ children: "The child stays inside the error boundary." }',
  "src/components/LiberalitasSignature.tsx": '{ author: "Portal Control", className: "text-xs" }',
  "src/components/layout/Header.view.tsx": `{
    toggleSidebar: () => undefined,
    currentUser: { role: "Administrador" },
    welcomeName: "Ana Pérez",
    systemStatus: "Operativo",
    soundEnabled: true,
    isDropdownOpen: false,
    isChangePasswordModalOpen: false,
    isManualModalOpen: false,
    dropdownRef: createRef<HTMLDivElement>(),
    onToggleSound: () => undefined,
    onToggleDropdown: () => undefined,
    onOpenChangePassword: () => undefined,
    onOpenManual: () => undefined,
    onCloseChangePassword: () => undefined,
    onCloseManual: () => undefined,
    onLogout: () => undefined,
  }`,
  "src/components/layout/NotificationCenter.view.tsx": `{
    isOpen: true,
    unreadCount: 0,
    notifications: [],
    dropdownRef: createRef<HTMLDivElement>(),
    onToggleOpen: () => undefined,
    onNotificationClick: () => undefined,
  }`,
  "src/components/layout/PersistentLayout.view.tsx": `{
    children: "Contenido de la vista",
    currentPath: "/dashboard",
    isSidebarOpen: false,
    isInitialSync: false,
    canShowDevPanel: false,
    showHomeFab: true,
    homeFabTitle: "Ir al inicio",
    isHandoverModalOpen: false,
    handoverData: null,
    onToggleSidebar: () => undefined,
    onSwipeTouchStart: () => undefined,
    onSwipeTouchEnd: () => undefined,
    onGoHome: () => undefined,
    onCloseHandoverModal: () => undefined,
  }`,
  "src/components/layout/Sidebar.view.tsx": `{
    isOpen: true,
    isExpanded: true,
    menuItems: [],
    effectiveTheme: "light",
    showAboutModal: false,
    onToggleSidebar: () => undefined,
    onMouseEnter: () => undefined,
    onMouseLeave: () => undefined,
    onItemClick: () => undefined,
    onToggleTheme: () => undefined,
    onOpenAbout: () => undefined,
    onCloseAbout: () => undefined,
  }`,
  "src/components/layout/SidebarNavItem.tsx": `{
    to: "/dashboard",
    icon: HomeIcon,
    label: "Inicio",
    end: true,
    isExpanded: true,
    onClick: () => undefined,
  }`,
  "src/components/ui/AboutModal.view.tsx": `{
    isOpen: true,
    onClose: () => undefined,
    showMonkey: false,
    onCloseMonkey: () => undefined,
    onLogoClick: () => undefined,
  }`,
  "src/components/ui/Badge.tsx": '{ children: "Activo", variant: "success", size: "md", showDot: true }',
  "src/components/ui/Button.tsx": '{ children: "Guardar cambios", variant: "primary", size: "md" }',
  "src/components/ui/Card.tsx": '{ title: "Resumen", children: "Contenido de la tarjeta", variant: "default" }',
  "src/components/ui/Checkbox.tsx": '{ label: "Recibir notificaciones", checked: true }',
  "src/components/ui/CinematicModal.tsx": `{
    isOpen: true,
    onClose: () => undefined,
    title: "Vista previa",
    children: "Contenido del diálogo",
    maxWidth: "max-w-lg",
  }`,
  "src/components/ui/ConfirmationModal.tsx": `{
    isOpen: true,
    onClose: () => undefined,
    onConfirm: () => undefined,
    title: "Confirmar acción",
    message: "¿Deseas continuar con esta operación?",
    confirmText: "Continuar",
    cancelText: "Volver",
  }`,
  "src/components/ui/Container.tsx": '{ children: "Contenido alineado", variant: "standard" }',
  "src/components/ui/DataTableRow.tsx": '{ rowIndex: 0, children: "Fila de ejemplo" }',
  "src/components/ui/DatePickerDialog.tsx": `{
    isOpen: true,
    onClose: () => undefined,
    onSelect: () => undefined,
    initialDate: "2026-10-23",
  }`,
  "src/components/ui/EmptyState.tsx": '{ title: "Sin resultados", description: "Prueba con otros filtros." }',
  "src/components/ui/IconBox.tsx": '{ icon: <CheckCircleIcon className="h-5 w-5" />, variant: "success", size: "md" }',
  "src/components/ui/Input.tsx": '{ label: "Nombre", placeholder: "Escribe un nombre", value: "Ana Pérez" }',
  "src/components/ui/LiveStatus.tsx": '{ label: "Sistema operativo", status: "online" }',
  "src/components/ui/LoadingOverlay.tsx": '{ message: "Sincronizando datos…", fullScreen: false }',
  "src/components/ui/LoadingSpinner.tsx": '{ size: "md", variant: "default", label: "Cargando" }',
  "src/components/ui/MetricCard.tsx": `{
    kind: "metric",
    title: "Asistencia",
    value: "96%",
    label: "Esta semana",
    trend: { value: "+3.2%", isPositive: true },
    tone: "success",
  }`,
  "src/components/ui/NumericKeypad.tsx": `{
    onInput: () => undefined,
    onDelete: () => undefined,
    onConfirm: () => undefined,
  }`,
  "src/components/ui/PageHeader.tsx": '{ title: "Personal", subtitle: "Administra el equipo", eyebrow: "Operaciones" }',
  "src/components/ui/PaginationControls.tsx": '{ currentPage: 2, totalPages: 5, setCurrentPage: () => undefined }',
  "src/components/ui/PasswordChangeForm.tsx": `{
    newPassword: "Portal2026!",
    setNewPassword: () => undefined,
    confirmPassword: "Portal2026!",
    setConfirmPassword: () => undefined,
  }`,
  "src/components/ui/PremiumSearchInput.tsx": '{ value: "Ana", onChange: () => undefined, placeholder: "Buscar personal…" }',
  "src/components/ui/ReportTable.tsx": `{
    reportData: null,
    isSingleEmployeeReport: false,
    sortConfig: null,
    requestSort: () => undefined,
    currentPage: 1,
    setCurrentPage: () => undefined,
    justificationStyles: {},
  }`,
  "src/components/ui/RoleBadge.tsx": '{ role: "Administrador", size: "md" }',
  "src/components/ui/Select.tsx": `{
    label: "Área",
    value: "operaciones",
    options: [
      { value: "operaciones", label: "Operaciones" },
      { value: "mantencion", label: "Mantención" },
    ],
  }`,
  "src/components/ui/ServerClock.tsx": '{ showDate: true }',
  "src/components/ui/ShiftCalendarDayCell.tsx": `{
    day: new Date("2026-10-23T12:00:00"),
    dayData: undefined,
    isToday: true,
    cellHeightClass: "h-16",
    onDayClick: () => undefined,
  }`,
  "src/components/ui/Skeleton.tsx": '{ width: "12rem", height: "1rem" }',
  "src/components/ui/SortableHeader.tsx": `{
    title: "Nombre",
    sortKey: "name",
    sortConfig: null,
    onSort: () => undefined,
  }`,
  "src/components/ui/Switch.tsx": '{ checked: true, onChange: () => undefined, label: "Activar alertas" }',
  "src/components/ui/TabNav.tsx": `{
    tabs: [
      { id: "overview", label: "Resumen" },
      { id: "activity", label: "Actividad" },
    ],
    activeTab: "overview",
    onTabChange: () => undefined,
    ariaLabel: "Secciones de ejemplo",
  }`,
  "src/components/ui/Textarea.tsx": '{ label: "Comentario", value: "Buen trabajo", rows: 3 }',
  "src/components/ui/TimePickerDialog.tsx": `{
    isOpen: true,
    onClose: () => undefined,
    onSave: () => undefined,
    initialTime: "08:30",
  }`,
  "src/components/ui/ToastItem.tsx": `{
    toast: { id: "storybook-toast", message: "Cambios guardados", type: "success" },
    onDismiss: () => undefined,
  }`,
  "src/components/ui/Tooltip.tsx": '{ content: "Detalle de la acción", children: "Pasa el cursor" }',
  "src/components/ui/UserManualModal.tsx": '{ isOpen: true, onClose: () => undefined }',
  "src/components/ui/WeatherDisplay.tsx": '{ weather: null, isLoading: true }',
  "src/features/configuration/components/SeedingOptionsModal.view.tsx": `{
    isOpen: true,
    onClose: () => undefined,
    values: { employees: 15, days: 30, basePatternsCount: 3, leaveRatio: 5, correctionRequestRatio: 2, shiftReportsPerDay: 1, quickNotesCount: 10 },
    getError: () => undefined,
    handleNumberChange: () => undefined,
    applyQuickSeedPreset: () => undefined,
    applyIncrementalPreset: () => undefined,
    incrementalLevel: 1,
    maxIncrementalLevel: 4,
    isSubmitting: false,
    formProps: { id: "seeding-story", noValidate: true, onSubmit: () => undefined, "data-app-form": "storybook" },
  }`,
  "src/features/configuration/components/SeedingProgressModal.tsx": `{
    isOpen: true,
    onClose: () => undefined,
    progressSteps: ["Preparando datos", "Validando registros"],
    isFinished: true,
    error: null,
    seedingOptions: null,
  }`,
  "src/features/configuration/components/SmtpConfigModal.view.tsx": `{
    isOpen: true,
    onClose: () => undefined,
    values: { host: "smtp.example.com", port: 587, secure: true, user: "operaciones", pass: "example", fromEmail: "operaciones@example.com", fromName: "Portal Control" },
    getError: () => undefined,
    handleFieldChange: () => undefined,
    applyPreset: () => undefined,
    handleTestConnection: async () => undefined,
    handleSetActive: () => undefined,
    selectSlot: () => undefined,
    currentSlot: 0,
    activeProfileIndex: 0,
    isLoading: false,
    isVerifying: false,
    isSubmitting: false,
    formProps: { id: "smtp-story", noValidate: true, onSubmit: () => undefined, "data-app-form": "storybook" },
  }`,
  "src/features/employee-management/components/ImportModal.tsx": `{
    isOpen: true,
    onClose: () => undefined,
    onImport: async () => true,
    title: "Importar personal",
    schema: { name: { prop: "name", type: String, required: true } },
  }`,
  "src/features/employee-management/components/ShiftHistoryModal.tsx": '{ isOpen: false, onClose: () => undefined, employeeId: "employee-01", employeeName: "Ana Pérez" }',
  "src/features/governance/components/ExportLogsModal.tsx": '{ isOpen: false, onClose: () => undefined }',
  "src/features/logbook/components/AddNoveltyModal.view.tsx": `{
    isOpen: true,
    onClose: () => undefined,
    isEditing: false,
    values: { annotation: "Entrega de turno realizada", time: "08:30" },
    getError: () => undefined,
    handleAnnotationChange: () => undefined,
    handleTimeChange: () => undefined,
    isTimePickerOpen: false,
    openTimePicker: () => undefined,
    closeTimePicker: () => undefined,
    isSubmitting: false,
    submit: () => undefined,
    formProps: { id: "novelty-story", noValidate: true, onSubmit: () => undefined, "data-app-form": "storybook" },
  }`,
  "src/features/logbook/components/AddSupplierModal.view.tsx": `{
    isOpen: true,
    onClose: () => undefined,
    isEditing: false,
    values: { licensePlate: "AB-CD-12", driverName: "Juan Pérez", paxCount: 2, company: "Transportes Sur", reason: "Mantención", time: "08:30" },
    getError: () => undefined,
    handleLicensePlateChange: () => undefined,
    handleDriverNameChange: () => undefined,
    handleCompanyChange: () => undefined,
    handleReasonChange: () => undefined,
    handlePaxCountChange: () => undefined,
    handleTimeChange: () => undefined,
    isTimePickerOpen: false,
    openTimePicker: () => undefined,
    closeTimePicker: () => undefined,
    isSubmitting: false,
    submit: () => undefined,
    formProps: { id: "supplier-story", noValidate: true, onSubmit: () => undefined, "data-app-form": "storybook" },
  }`,
  "src/features/logbook/components/ClosedReportsModal.tsx": `{
    isOpen: true,
    onClose: () => undefined,
    onDownloadPDF: () => undefined,
    onExportExcel: () => undefined,
    onPreview: () => undefined,
  }`,
  "src/features/theoretical-shifts/components/HolidayForm.tsx": `{
    values: { date: "2026-12-25", name: "Navidad", type: "Nacional", isRenounceable: false },
    getError: () => undefined,
    setValue: () => undefined,
    formProps: { id: "holiday-story", noValidate: true, onSubmit: () => undefined, "data-app-form": "storybook" },
    isSubmitting: false,
    isDatePickerOpen: false,
    onOpenDatePicker: () => undefined,
    onCloseDatePicker: () => undefined,
    onCancel: () => undefined,
  }`,
  "src/features/theoretical-shifts/components/PatternForm.tsx": `{
    onCancel: () => undefined,
    patternForm: {
      editingPattern: null,
      setEditingPattern: () => undefined,
      values: {
        name: "Turno diurno",
        cycleLengthDays: 1,
        startDayOfWeek: 1,
        dailySchedules: [{ dayIndex: 0, startTime: "08:00", endTime: "17:00", isOffDay: false, hasColacion: true, colacionMinutes: 60, hours: 8 }],
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
      formProps: { id: "pattern-story", noValidate: true, onSubmit: () => undefined, "data-app-form": "storybook" },
    },
  }`,
  "src/features/theoretical-shifts/views/AssignmentManager.view.tsx": `{
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
      formProps: { id: "assignment-story", noValidate: true, onSubmit: () => undefined, "data-app-form": "storybook" },
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
  }`,
  "src/features/theoretical-shifts/views/HolidayManager.view.tsx": `{
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
    formProps: { id: "holiday-manager-story", noValidate: true, onSubmit: () => undefined, "data-app-form": "storybook" },
    setShowArchived: () => undefined,
    setIsFormVisible: () => undefined,
    setHolidayToDelete: () => undefined,
    setIsDatePickerOpen: () => undefined,
    handleCancelForm: () => undefined,
    handleEditClick: () => undefined,
    handleLoadHolidays: async () => undefined,
    handleConfirmDeleteHoliday: async () => undefined,
  }`,
  "src/features/theoretical-shifts/views/LeaveManager.view.tsx": `{
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
    formValues: { employeeId: "", type: "Vacaciones", startDate: "2026-10-24", endDate: "2026-10-25", notes: "" },
    getError: () => undefined,
    setValue: () => undefined,
    isStartDatePickerOpen: false,
    isEndDatePickerOpen: false,
    searchTerm: "",
    isDropdownOpen: false,
    searchContainerRef: createRef<HTMLDivElement>(),
    filteredEmployeesForSearch: [],
    isSubmitting: false,
    formProps: { id: "leave-story", noValidate: true, onSubmit: () => undefined, "data-app-form": "storybook" },
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
  }`,
  "src/features/theoretical-shifts/views/PatternManager.view.tsx": `{
    searchTerm: "",
    fetchNextPage: () => undefined,
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    refetch: () => undefined,
    patternForm: {
      editingPattern: null,
      setEditingPattern: () => undefined,
      values: { name: "Turno diurno", cycleLengthDays: 1, startDayOfWeek: 1, dailySchedules: [{ dayIndex: 0, startTime: "08:00", endTime: "17:00", isOffDay: false, hasColacion: true, colacionMinutes: 60, hours: 8 }], color: "blue", maxHoursPattern: 40, worksOnHolidays: false },
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
      formProps: { id: "pattern-manager-story", noValidate: true, onSubmit: () => undefined, "data-app-form": "storybook" },
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
  }`,
  "src/features/time-control/components/AnomalyResolutionModal.tsx": `{
    isOpen: true,
    onClose: () => undefined,
    record: { id: "record-01", employeeId: "employee-01", employeeName: "Ana Pérez", employeePosition: "Operadora", employeeArea: "Operaciones", employeeWorkdayType: "Full Time", date: "2026-10-23", status: "AnomaliaManual", lastModified: 0, syncStatus: "synced", isDeleted: false, scheduleInfo: null },
    onEdit: () => undefined,
    onResolve: async () => undefined,
    isProcessing: false,
  }`,
  "src/features/time-control/components/RecordHistoryModal.tsx": '{ isOpen: true, onClose: () => undefined, recordId: null, employeeName: "Ana Pérez", date: "23-10-2026" }',
  "src/features/time-control/components/TimeRecordTable.tsx": `{
    records: [],
    fetchNextPage: () => undefined,
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    onRowDoubleClick: () => undefined,
    onAddComment: () => undefined,
    onDelete: () => undefined,
    isActionDisabledForRole: false,
    roleBasedTooltip: "",
    accountingLockDate: null,
    isControlInternoEnabled: true,
    searchName: "",
    onSearchChange: () => undefined,
    onExportStreaming: () => undefined,
    onViewHistory: () => undefined,
  }`,
  "src/features/time-control/components/ClockingPanel.tsx": '{ isActionDisabled: false, roleBasedTooltip: "Registrar marcaje" }',
  "src/features/time-control/components/ShiftHandoverModal.tsx": '{ isOpen: false, onClose: () => undefined, data: null }',
};

function storyIdFor(file) {
  const slug = file
    .replace(/^src\//, "")
    .replace(/\.view\.tsx$/, "")
    .replace(/\.tsx?$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `certified-${slug}`;
}

function storyTitleFor(file) {
  const tail = file
    .replace(/^src\//, "")
    .replace(/\.view\.tsx$/, "")
    .replace(/\.tsx?$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1/$2");
  return `Design System/${tail}`;
}

function importStatement(file) {
  const extensionless = `./${path.basename(file).replace(/\.tsx?$/, "")}`;
  const exportName = namedExports[file];
  return exportName
    ? `import { ${exportName} as StoryComponent } from "${extensionless}";`
    : `import StoryComponent from "${extensionless}";`;
}

function makeStory(file) {
  const entryPath = path.join(frontendRoot, file);
  const storyPath = entryPath.replace(/\.tsx?$/, ".stories.tsx");
  const id = storyIdFor(file);
  const title = storyTitleFor(file);

  if (file === "src/features/theoretical-shifts/components/listTokens.ts") {
    return `import type { Meta, StoryObj } from "@storybook/react-vite";
import { ROW_ARCHIVED_CLASS, ROW_BASE_CLASS, ROW_HOVER_CLASS, TEXT_PRIMARY, TEXT_SECONDARY } from "./listTokens";

const TOKEN_CLASSES = [ROW_BASE_CLASS, ROW_HOVER_CLASS, ROW_ARCHIVED_CLASS, TEXT_PRIMARY, TEXT_SECONDARY];
const TokenClassGallery = () => (
  <div className="space-y-3">
    {TOKEN_CLASSES.map((className) => (
      <div key={className} className={className}>
        <code className="rounded bg-token-surface-card px-2 py-1 text-xs">{className}</code>
        <span className="ml-3 text-sm text-token-text-primary">Ejemplo de fila teórica</span>
      </div>
    ))}
  </div>
);

const meta = {
  id: "${id}",
  title: "${title}",
  component: TokenClassGallery,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "Galería de las clases exportadas por listTokens.ts; el origen es un diccionario, no un componente React." } } },
} satisfies Meta<typeof TokenClassGallery>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
`;
  }

  if (file === "src/components/ui/DataTable.tsx" || file === "src/components/ui/DataTableHeader.tsx") {
    const isGrid = file.endsWith("DataTable.tsx");
    const tableTitle = isGrid ? "DataTableStory" : "DataTableHeaderStory";
    return `import type { Meta, StoryObj } from "@storybook/react-vite";
import { createColumnHelper, createSortedRowModel, rowSortingFeature, tableFeatures, useTable } from "@tanstack/react-table";
${isGrid ? 'import DataTable from "./DataTable";' : ""}
import DataTableHeader from "./DataTableHeader";
import DataTableRow from "./DataTableRow";

interface Person { name: string; area: string }
const rows: Person[] = [
  { name: "Ana Pérez", area: "Operaciones" },
  { name: "Luis Soto", area: "Mantención" },
];
const features = tableFeatures({ rowSortingFeature, sortedRowModel: createSortedRowModel() });
const helper = createColumnHelper<typeof features, Person>();
const columns = helper.columns([
  helper.accessor("name", { header: "Colaborador", enableSorting: true }),
  helper.accessor("area", { header: "Área", enableSorting: true }),
]);
function ${tableTitle}() {
  const table = useTable({ features, data: rows, columns });
  return ${isGrid ? `<DataTable table={table} ariaLabel="Personal" rowCount={rows.length}>
    <DataTableHeader table={table} />
    <tbody>{table.getRowModel().rows.map((row, index) => <DataTableRow key={row.id} rowIndex={index}>
      {row.getAllCells().map((cell) => <td key={cell.id} className="px-4 py-3 text-token-text-primary">{String(cell.getValue() ?? "")}</td>)}
    </DataTableRow>)}</tbody>
  </DataTable>` : `<table className="w-full"><DataTableHeader table={table} /><tbody>{table.getRowModel().rows.map((row, index) => <DataTableRow key={row.id} rowIndex={index}>
    {row.getAllCells().map((cell) => <td key={cell.id} className="px-4 py-3 text-token-text-primary">{String(cell.getValue() ?? "")}</td>)}
  </DataTableRow>)}</tbody></table>`};
}

const meta = { id: "${id}", title: "${title}", component: ${tableTitle}, tags: ["autodocs"] } satisfies Meta<typeof ${tableTitle}>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
`;
  }

  if (file === "src/components/ui/SortableHeader.tsx") {
    return `import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./SortableHeader";

function SortableHeaderStory() {
  return <table className="w-full"><thead><tr><StoryComponent<Record<string, unknown>> title="Colaborador" sortKey="name" sortConfig={null} onSort={() => undefined} /></tr></thead></table>;
}
const meta = { id: "${id}", title: "${title}", component: SortableHeaderStory, tags: ["autodocs"] } satisfies Meta<typeof SortableHeaderStory>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
`;
  }

  if (file === "src/components/ui/MetricCard.tsx") {
    return `import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./MetricCard";

const meta = {
  id: "${id}",
  title: "${title}",
  component: StoryComponent,
  tags: ["autodocs"],
} satisfies Meta<typeof StoryComponent>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { kind: "metric", title: "Asistencia", value: "96%", label: "Esta semana", trend: { value: "+3.2%", isPositive: true }, tone: "success" } };
export const Panel: Story = { args: { kind: "panel", title: "Equipo", icon: <span aria-hidden="true">👥</span>, children: <p className="text-token-text-secondary">18 personas activas</p> } };
`;
  }

  if (file === "src/components/ui/Button.tsx") {
    return `import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./Button";
const meta = { id: "${id}", title: "${title}", component: StoryComponent, args: { children: "Guardar cambios" }, tags: ["autodocs"] } satisfies Meta<typeof StoryComponent>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { variant: "primary", size: "md" } };
export const Primary: Story = { args: { variant: "primary", size: "md" } };
export const Secondary: Story = { args: { variant: "secondary", size: "md" } };
export const Disabled: Story = { args: { variant: "primary", size: "md", disabled: true } };
`;
  }

  if (file === "src/components/ui/Badge.tsx") {
    return `import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./Badge";
const meta = { id: "${id}", title: "${title}", component: StoryComponent, args: { size: "md" }, tags: ["autodocs"] } satisfies Meta<typeof StoryComponent>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { children: "Activo", variant: "success", showDot: true } };
export const Success: Story = { args: { children: "Activo", variant: "success", showDot: true } };
export const Warning: Story = { args: { children: "Pendiente", variant: "warning", showDot: true } };
export const Danger: Story = { args: { children: "Bloqueado", variant: "danger", showDot: false } };
`;
  }

  const baseName = path.basename(file).replace(/\.tsx?$/, "");
  const imports = [
    'import type { Meta, StoryObj } from "@storybook/react-vite";',
    extraImports[file]?.trimEnd(),
    importStatement(file),
  ].filter(Boolean);
  const args = argsByPath[file];
  const metaArgs = args ? `\n  args: ${args},` : "";
  return `${imports.join("\n")}

const meta = {
  id: "${id}",
  title: "${title}",
  component: StoryComponent,${metaArgs}
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "Archivo certificado: ${file}" } } },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
`;
}

const force = process.argv.includes("--force");
let created = 0;
async function scaffoldStories() {
  for (const file of certified.files) {
    const storyPath = path.join(frontendRoot, file).replace(/\.tsx?$/, ".stories.tsx");
    if (fs.existsSync(storyPath) && !force) continue;
    const prettierConfig = (await prettier.resolveConfig(storyPath)) ?? {};
    const story = await prettier.format(makeStory(file), {
      ...prettierConfig,
      filepath: storyPath,
      parser: "typescript",
    });
    fs.writeFileSync(storyPath, story);
    created += 1;
  }
  console.log(`Historias creadas: ${created}; certificadas: ${certified.files.length}.`);
}

scaffoldStories().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
