import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Employee, Syncable, UserRole } from "../../../types/index";
import { useEmployees } from "../../../hooks/useEmployees";
import { useAuth } from "../../../hooks/useAuth";
import { useToasts } from "../../../hooks/useToasts";
import { useAreaListQuery, useWorkdayTypeListQuery } from "../../../hooks/queries/useConfigQuery";
import { exportToCSV, exportToPDF } from "../../../utils/export/index";
import { exportService } from "../../../services/exportService";
import { useDebounce } from "../../../hooks/useDebounce";
import { useIntersectionObserver } from "../../../hooks/useIntersectionObserver";

type EditableEmployeeData = Partial<
  Pick<Employee, "name" | "rut" | "position" | "area" | "workdayType" | "email" | "pin">
> & {
  createUserAccount?: boolean;
};

type SortableEmployeeKey = keyof Employee;

export type EmployeeManagementView = "active" | "archived";

interface UseEmployeeManagementDataParams {
  isEmbedded?: boolean;
}

export const useEmployeeManagementData = ({ isEmbedded }: UseEmployeeManagementDataParams = {}) => {
  const {
    employees: activeListStore,
    archivedEmployees: archivedListStore,
    isLoadingEmployees,
    addEmployee,
    updateEmployee,
    getNextEmployeeId,
    createBulkEmployees,
    archiveEmployee,
    reactivateEmployee,
    checkOpenRecord,
    refreshEmployees,
  } = useEmployees();

  const { addToast } = useToasts();
  const { currentUser } = useAuth();
  const { data: areaList = [], isLoading: isAreasLoading } = useAreaListQuery();
  const { data: workdayTypeList = [], isLoading: isWorkdayTypesLoading } =
    useWorkdayTypeListQuery();
  const isLoadingConfig = isAreasLoading || isWorkdayTypesLoading;

  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeToArchive, setEmployeeToArchive] = useState<Employee | null>(null);
  const [employeeData, setEmployeeData] = useState<EditableEmployeeData>({
    createUserAccount: true,
  });
  const [nextId, setNextId] = useState("");

  const [searchTermTable, setSearchTermTable] = useState("");
  const debouncedSearchTerm = useDebounce(searchTermTable, 300);

  const [view, setView] = useState<EmployeeManagementView>("active");
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [historyModalEmployee, setHistoryModalEmployee] = useState<Employee | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [hasOpenRecord, setHasOpenRecord] = useState(false);

  const pageSize = isMobile ? 20 : 50;
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const processedEmployees = useMemo(() => {
    const baseList = view === "active" ? activeListStore : archivedListStore;
    const filtered = baseList.filter((e) => {
      if (!debouncedSearchTerm) return true;
      const search = debouncedSearchTerm.toLowerCase();
      return (
        e.name.toLowerCase().includes(search) ||
        (e.rut && e.rut.toLowerCase().includes(search)) ||
        e.position.toLowerCase().includes(search) ||
        e.area.toLowerCase().includes(search)
      );
    });
    return filtered.slice(0, visibleCount);
  }, [view, activeListStore, archivedListStore, debouncedSearchTerm, visibleCount]);

  const hasNextPage = useMemo(() => {
    const baseList = view === "active" ? activeListStore : archivedListStore;
    const search = debouncedSearchTerm.toLowerCase();
    const totalFiltered = baseList.filter((e) => {
      if (!search) return true;
      return (
        e.name.toLowerCase().includes(search) ||
        (e.rut && e.rut.toLowerCase().includes(search)) ||
        e.position.toLowerCase().includes(search) ||
        e.area.toLowerCase().includes(search)
      );
    }).length;
    return visibleCount < totalFiltered;
  }, [view, activeListStore, archivedListStore, debouncedSearchTerm, visibleCount]);

  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const entry = useIntersectionObserver(sentinelRef, { root: scrollRoot, rootMargin: "200px" });

  useEffect(() => {
    if (entry?.isIntersecting && hasNextPage) {
      setVisibleCount((prev) => prev + pageSize);
    }
  }, [entry?.isIntersecting, hasNextPage, pageSize]);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [view, debouncedSearchTerm, pageSize]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleImportEmployees = async (data: Partial<Employee>[]) => {
    try {
      const result = await createBulkEmployees(data as unknown as Employee[]);
      if (result) {
        refreshEmployees();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Import failed", error);
      return false;
    }
  };

  const importSchema = {
    ID: { prop: "id", type: String, required: true },
    Nombre: { prop: "name", type: String, required: true },
    RUT: { prop: "rut", type: String, required: true },
    Email: { prop: "email", type: String },
    Cargo: { prop: "position", type: String },
    Area: { prop: "area", type: String },
    Jornada: { prop: "workdayType", type: String },
    Estado: { prop: "status", type: String },
    PIN: { prop: "pin", type: String, required: true },
  };

  const handleViewChange = useCallback(async (newView: EmployeeManagementView) => {
    setView(newView);
  }, []);

  const handleOpenNewForm = () => {
    setEditingEmployee(null);
    setEmployeeData({ createUserAccount: true });
    setIsFormVisible(true);
  };

  const handleReactivate = async (employeeId: string) => {
    const employee = processedEmployees.find((e) => e.id === employeeId);
    if (!employee) return;
    await reactivateEmployee(employee);
  };

  useEffect(() => {
    if (!isFormVisible) {
      setNextId(getNextEmployeeId());
    }
  }, [isFormVisible, getNextEmployeeId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setEmployeeData({
      name: employee.name,
      rut: employee.rut,
      position: employee.position,
      area: employee.area,
      email: employee.email,
      workdayType: employee.workdayType,
      createUserAccount: false,
    });
    setIsFormVisible(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    setEditingEmployee(null);
    setEmployeeData({ createUserAccount: true });
    setIsFormVisible(false);
  };

  const handleSave = async (): Promise<boolean> => {
    const { createUserAccount, ...dataToSave } = employeeData;

    let success: boolean;
    if (editingEmployee) {
      success = await updateEmployee({
        ...editingEmployee,
        ...dataToSave,
        createUserAccount,
      } as Employee & { createUserAccount?: boolean });
    } else {
      const newEmp = await addEmployee({
        ...dataToSave,
        createUserAccount,
      } as Omit<Employee, "id" | "status" | keyof Syncable> & {
        createUserAccount?: boolean;
      });
      success = !!newEmp;
    }

    if (success) {
      refreshEmployees();
      handleCancel();
    }
    return success;
  };

  const handleConfirmArchive = async () => {
    if (!employeeToArchive) return;
    await archiveEmployee(employeeToArchive);
  };

  const requestSort = (_key: SortableEmployeeKey) => {
    addToast("Ordenamiento por columna no disponible en modo infinito.", "info");
  };

  const handleExport = (format: "csv" | "excel" | "pdf") => {
    if (processedEmployees.length === 0) {
      addToast("No hay datos cargados para exportar.", "info");
      return;
    }

    setIsExportMenuOpen(false);
    const headers = ["ID", "Nombre", "RUT", "Email", "Cargo", "Área", "Tipo Jornada", "Estado"];
    const data = processedEmployees.map((emp) => [
      emp.id,
      emp.name,
      emp.rut,
      emp.email || "N/A",
      emp.position,
      emp.area,
      emp.workdayType || "N/A",
      emp.status || "N/A",
    ]);

    const filtersString = searchTermTable
      ? `Filtro aplicado: "${searchTermTable}"`
      : "Sin filtros específicos";

    switch (format) {
      case "csv":
        exportToCSV(headers, data, "lista_empleados");
        break;
      case "excel":
        exportService.downloadEmployeesExcel({
          search: searchTermTable,
          status: view === "active" ? "Activo" : "Archivado",
        });
        break;
      case "pdf":
        exportToPDF("Lista de Empleados", headers, data, filtersString, {
          7: "status",
        });
        break;
      default:
        addToast("Formato de exportación no soportado.", "error");
        return;
    }

    const formatLabel = format === "pdf" ? "impresión" : format.toUpperCase();
    addToast(
      `${format === "pdf" ? "Lista de empleados enviada a" : "Lista de empleados exportada a"} ${formatLabel}.`,
      "success",
    );
  };

  const canPerformAction = (userRole: UserRole, requiredRoles: UserRole[]): boolean => {
    return requiredRoles.includes(userRole);
  };

  const canArchive = canPerformAction(currentUser?.role as UserRole, [
    "Administrador",
    "Supervisor_Elevado",
  ]);
  const canEdit = canPerformAction(currentUser?.role as UserRole, [
    "Administrador",
    "Supervisor_Elevado",
    "Supervisor",
    "Reloj_Control",
  ]);

  const handleSelectEmployeeToArchive = async (employee: Employee) => {
    const isOpen = await checkOpenRecord(employee.id);
    setHasOpenRecord(isOpen);
    setEmployeeToArchive(employee);
  };

  return {
    isEmbedded,
    areaList,
    workdayTypeList,
    isLoadingEmployees,
    isLoadingConfig,
    isFormVisible,
    editingEmployee,
    employeeToArchive,
    employeeData,
    nextId,
    searchTermTable,
    view,
    isExportMenuOpen,
    exportMenuRef,
    historyModalEmployee,
    isImportModalOpen,
    isMobile,
    hasOpenRecord,
    processedEmployees,
    hasNextPage,
    sentinelRef,
    setScrollRoot,
    importSchema,
    canArchive,
    canEdit,
    setSearchTermTable,
    handleViewChange,
    handleOpenNewForm,
    handleReactivate,
    setIsExportMenuOpen,
    handleEdit,
    handleCancel,
    handleSave,
    requestSort,
    handleExport,
    setIsImportModalOpen,
    handleImportEmployees,
    setEmployeeData,
    setEmployeeToArchive,
    handleConfirmArchive,
    setHistoryModalEmployee,
    handleSelectEmployeeToArchive,
  };
};
