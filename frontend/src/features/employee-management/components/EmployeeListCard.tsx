import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Employee } from "../../../types/index";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import PaginationControls from "../../../components/ui/PaginationControls";
import SortableHeader from "../../../components/ui/SortableHeader";
import {
  EditIcon,
  KeyIcon,
  ArchiveBoxIcon,
  ArrowUturnLeftIcon,
} from "../../../components/ui/icons/index";

type SortableEmployeeKey = keyof Employee;

interface EmployeeListCardProps {
  paginatedEmployees: Employee[];
  sortConfig: {
    key: SortableEmployeeKey;
    direction: "ascending" | "descending";
  } | null;
  requestSort: (key: SortableEmployeeKey) => void;
  onEdit: (employee: Employee) => void;
  onArchive: (employee: Employee) => void;
  onReactivate: (employeeId: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  view: "active" | "archived";
  isMobile: boolean;
  canEdit: boolean;
  canArchive: boolean;
  hidePagination?: boolean;
}

const EmployeeListCard: React.FC<EmployeeListCardProps> = ({
  paginatedEmployees,
  sortConfig,
  requestSort,
  onEdit,
  onArchive,
  onReactivate,
  currentPage,
  totalPages,
  onPageChange,
  view,
  isMobile,
  canEdit,
  canArchive,
  hidePagination = false,
}) => {
  const renderMobileView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
      <AnimatePresence>
        {paginatedEmployees.length > 0 ? (
          paginatedEmployees.map((emp, i) => (
            <motion.div
              key={emp.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.05 }}
              className="bg-token-surface-card rounded-lg border border-token-border-technical p-6 flex flex-col shadow-sm relative overflow-hidden group"
            >
              <div
                className={`absolute top-0 left-0 w-1 h-full ${
                  emp.status === "Activo" ? "bg-emerald-500" : "bg-gray-400"
                }`}
              />

              <div className="flex justify-between items-start mb-4 pl-2">
                <div>
                  <h4 className="text-sm font-black text-token-text-primary uppercase tracking-tight">
                    {emp.name}
                  </h4>
                  <p className="text-[10px] font-black text-sap-blue uppercase tracking-widest mt-1">
                    {emp.position}
                  </p>
                </div>
                <Badge
                  variant={emp.status === "Activo" ? "success" : "neutral"}
                  size="sm"
                  className="uppercase tracking-widest text-[9px]"
                >
                  {emp.status}
                </Badge>
              </div>

              <div className="bg-token-surface-stripe rounded-md p-3 space-y-2 mb-4 border border-token-border-subtle">
                <div className="flex justify-between">
                  <span className="text-[9px] font-black text-token-text-tertiary uppercase tracking-widest">
                    RUT
                  </span>
                  <span className="text-xs font-mono font-bold text-token-text-secondary">
                    {emp.rut}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[9px] font-black text-token-text-tertiary uppercase tracking-widest">
                    Área
                  </span>
                  <span className="text-xs font-bold text-token-text-secondary uppercase">
                    {emp.area}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[9px] font-black text-token-text-tertiary uppercase tracking-widest">
                    Jornada
                  </span>
                  <span className="text-xs font-bold text-token-text-secondary uppercase">
                    {emp.workdayType}
                  </span>
                </div>
              </div>

              <div className="mt-auto flex justify-end gap-2 pt-2 border-t border-token-border-subtle">
                {view === "active" ? (
                  <>
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onEdit(emp)}
                        className="flex-1 justify-center bg-white dark:bg-gray-800 hover:bg-sap-blue/10 hover:text-sap-blue border-black/10 dark:border-white/10"
                      >
                        <EditIcon className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                    )}
                    {canArchive && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => onArchive(emp)}
                        className="w-10 px-0 flex items-center justify-center bg-white dark:bg-gray-800 text-red-500 border-black/10 dark:border-white/10 hover:bg-red-50"
                      >
                        <ArchiveBoxIcon className="w-4 h-4" />
                      </Button>
                    )}
                  </>
                ) : (
                  canArchive && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onReactivate(emp.id)}
                      className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                    >
                      <ArrowUturnLeftIcon className="w-4 h-4 mr-2" />
                      Reactivar
                    </Button>
                  )
                )}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-16 text-center bg-token-surface-stripe rounded-lg border-2 border-dashed border-token-border-technical">
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 italic">
              No se encontraron empleados.
            </p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderDesktopView = () => (
    <div className="border border-token-border-technical bg-token-surface-stripe rounded-lg">
      <table className="min-w-full border-separate border-spacing-0">
        <thead className="sticky top-0 z-20 bg-token-surface-header backdrop-blur-sm">
          <tr>
            <SortableHeader
              title="Nombre"
              sortKey="name"
              sortConfig={sortConfig}
              onSort={requestSort}
              className="px-6 py-4 text-left text-[10px] font-black text-token-text-secondary uppercase tracking-[0.3em] border-b border-token-border-subtle cursor-pointer hover:bg-black/5 transition-colors"
            />
            <SortableHeader
              title="RUT"
              sortKey="rut"
              sortConfig={sortConfig}
              onSort={requestSort}
              className="px-6 py-4 text-left text-[10px] font-black text-token-text-secondary uppercase tracking-[0.3em] border-b border-token-border-subtle cursor-pointer hover:bg-black/5 transition-colors"
            />
            <SortableHeader
              title="Área"
              sortKey="area"
              sortConfig={sortConfig}
              onSort={requestSort}
              className="px-6 py-4 text-left text-[10px] font-black text-token-text-secondary uppercase tracking-[0.3em] border-b border-token-border-subtle cursor-pointer hover:bg-black/5 transition-colors"
            />
            <SortableHeader
              title="Jornada"
              sortKey="workdayType"
              sortConfig={sortConfig}
              onSort={requestSort}
              className="px-6 py-4 text-left text-[10px] font-black text-token-text-secondary uppercase tracking-[0.3em] border-b border-token-border-subtle cursor-pointer hover:bg-black/5 transition-colors"
            />
            <th className="px-6 py-4 text-right text-[10px] font-black text-token-text-secondary uppercase tracking-[0.3em] border-b border-token-border-subtle">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-token-border-subtle bg-token-surface-card">
          {paginatedEmployees.length > 0 ? (
            paginatedEmployees.map((emp) => (
              <tr
                key={emp.id}
                className="group hover:bg-sap-blue/[0.02] dark:hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-token-text-primary uppercase tracking-tight">
                      {emp.name}
                    </span>
                    <span className="text-[10px] font-black text-sap-blue uppercase tracking-widest">
                      {emp.position}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-xs font-mono font-bold text-token-text-secondary">
                      {emp.rut}
                    </span>
                    <span className="text-[9px] font-black text-token-text-tertiary uppercase tracking-widest">
                      Identificador
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-token-text-secondary uppercase tracking-tight">
                      {emp.area}
                    </span>
                    <span className="text-[9px] font-black text-token-text-tertiary uppercase tracking-widest">
                      Departamento
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-token-text-secondary uppercase tracking-tight">
                      {emp.workdayType}
                    </span>
                    <span className="text-[9px] font-black text-token-text-tertiary uppercase tracking-widest">
                      Tipo Jornada
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                    {view === "active" ? (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onEdit(emp)}
                          className="!p-2 shadow-sm rounded-md border-gray-200 dark:border-gray-700 hover:bg-sap-blue hover:text-white"
                          title="Editar"
                        >
                          <EditIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {}}
                          className="!p-2 shadow-sm rounded-md border-gray-200 dark:border-gray-700 hover:bg-purple-500 hover:text-white"
                          title="Cambiar PIN (Simulado)"
                        >
                          <KeyIcon className="w-4 h-4" />
                        </Button>
                        {canArchive && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => onArchive(emp)}
                            className="!p-2 shadow-sm rounded-md border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-500 hover:text-white"
                            title="Archivar"
                          >
                            <ArchiveBoxIcon className="w-4 h-4" />
                          </Button>
                        )}
                      </>
                    ) : (
                      canArchive && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => onReactivate(emp.id)}
                          className="!px-4 bg-emerald-600 hover:bg-emerald-700 text-white border-none rounded-md font-bold uppercase text-[10px] tracking-widest"
                        >
                          <ArrowUturnLeftIcon className="w-4 h-4 mr-2" />
                          Reactivar
                        </Button>
                      )
                    )}
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={6}
                className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400 italic"
              >
                No hay empleados para mostrar.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      {isMobile ? renderMobileView() : renderDesktopView()}

      {!hidePagination && paginatedEmployees.length > 0 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={onPageChange}
        />
      )}
    </div>
  );
};

export default EmployeeListCard;
