/* UI-PROTECTED: EDIT ONLY WITH HUMAN APPROVAL
   Presentational layer for HolidayManager.
*/

import React from "react";
import Button from "../../../components/ui/Button";
import Container from "../../../components/ui/Container";
import ConfirmationModal from "../../../components/ui/ConfirmationModal";
import {
  PlusCircleIcon,
  CloudArrowDownIcon,
  CalendarDaysIcon,
} from "../../../components/ui/icons/index";
import ResponsiveView from "../../../components/ui/ResponsiveView";
import EmptyState from "../../../components/ui/EmptyState";
import HolidayListDesktop from "../components/HolidayListDesktop";
import HolidayListMobile from "../components/HolidayListMobile";
import HolidayForm from "../components/HolidayForm";
import type { Holiday } from "../../../types";

export interface HolidayManagerViewProps {
  showArchived: boolean;
  fetchNextPage: () => unknown;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  refetch: () => unknown;
  isPending: boolean;
  isFormVisible: boolean;
  editingHoliday: Holiday | null;
  holidayToDelete: Holiday | null;
  sortedHolidays: Holiday[];
  existingDates: string[];
  holidays: Holiday[];
  setShowArchived: React.Dispatch<React.SetStateAction<boolean>>;
  setIsFormVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setHolidayToDelete: React.Dispatch<React.SetStateAction<Holiday | null>>;
  handleCancelForm: () => void;
  handleEditClick: (holiday: Holiday) => void;
  handleSaveWrapper: (data: { name: string; date: string; type: Holiday["type"] }) => Promise<void>;
  handleLoadHolidays: () => Promise<void>;
  handleConfirmDeleteHoliday: () => Promise<void>;
}

export const HolidayManagerView: React.FC<HolidayManagerViewProps> = ({
  showArchived,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  refetch,
  isPending,
  isFormVisible,
  editingHoliday,
  holidayToDelete,
  sortedHolidays,
  existingDates,
  holidays,
  setShowArchived,
  setIsFormVisible,
  setHolidayToDelete,
  handleCancelForm,
  handleEditClick,
  handleSaveWrapper,
  handleLoadHolidays,
  handleConfirmDeleteHoliday,
}) => {
  return (
    <Container
      id="holiday-manager-section"
      variant="wide"
      noPadding
      data-ui-protected
      className="space-y-6 h-full flex flex-col"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="typo-ui-title text-token-text-primary">Gestión de Feriados</h2>
          <p className="text-xs text-token-text-secondary mt-1">
            Administra el calendario de feriados nacionales e institucionales.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleLoadHolidays}
            variant="secondary"
            className="flex items-center gap-2"
            disabled={isPending}
          >
            <CloudArrowDownIcon className={`w-5 h-5 ${isPending ? "animate-bounce" : ""}`} />
            <span className="hidden md:inline">{isPending ? "Cargando..." : "Cargar del Año"}</span>
          </Button>
          {!isFormVisible && (
            <div className="animate-in fade-in zoom-in-90">
              <Button
                onClick={() => setIsFormVisible(true)}
                variant="primary"
                className="flex items-center gap-2"
              >
                <PlusCircleIcon className="w-5 h-5" />
                Nuevo Feriado
              </Button>
            </div>
          )}
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows,opacity,visibility] duration-300 ${isFormVisible ? "grid-rows-[1fr] opacity-100 visible" : "grid-rows-[0fr] opacity-0 invisible"}`}
      >
        <div className="overflow-hidden">
          <div className="bg-token-surface-card rounded-lg border border-token-border-technical p-6 shadow-sm">
            <HolidayForm
              initialData={editingHoliday}
              onSave={handleSaveWrapper}
              onCancel={handleCancelForm}
              existingDates={existingDates}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 h-[44px] bg-token-surface-card border border-token-border-technical rounded-md whitespace-nowrap w-full md:w-auto md:self-end">
        <CalendarDaysIcon className="w-4 h-4 text-token-text-tertiary" />
        <label className="flex items-center cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={() => setShowArchived((prev) => !prev)}
            className="hidden"
          />
          <div
            className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${showArchived ? "bg-token-accent-brand" : "bg-token-surface-technical"}`}
          >
            <div
              className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform duration-200 ${showArchived ? "translate-x-5" : ""}`}
            ></div>
          </div>
          <span className="ml-3 text-xs font-bold text-token-text-secondary uppercase tracking-wider">
            Ver Archivados
          </span>
        </label>
      </div>

      <div className="flex-1 min-h-[400px]">
        {holidays.length === 0 ? (
          <EmptyState
            title="Sin feriados configurados"
            description="Carga los feriados nacionales del año para automatizar cálculos."
            icon={<span className="text-2xl">🚩</span>}
            className="my-12"
          />
        ) : (
          <ResponsiveView
            mobile={
              <HolidayListMobile
                holidays={sortedHolidays}
                hasNextPage={!!hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
                onEdit={handleEditClick}
                onDelete={(h) => setHolidayToDelete(h)}
                showArchived={showArchived}
              />
            }
            desktop={
              <HolidayListDesktop
                holidays={sortedHolidays}
                hasNextPage={!!hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
                isLoading={isLoading}
                refetch={refetch}
                onEdit={handleEditClick}
                onDelete={(h) => setHolidayToDelete(h)}
                showArchived={showArchived}
              />
            }
          />
        )}
      </div>

      {holidayToDelete && (
        <ConfirmationModal
          isOpen
          onClose={() => setHolidayToDelete(null)}
          onConfirm={handleConfirmDeleteHoliday}
          title="Eliminar Feriado"
          message={`¿Está seguro de eliminar el feriado "${holidayToDelete.name}"? Esta acción afectará los cálculos de recargo.`}
          confirmVariant="danger"
        />
      )}
    </Container>
  );
};
