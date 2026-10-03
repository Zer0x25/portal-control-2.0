import React, { useState } from "react";
import { motion } from "framer-motion";
import { ShiftReport, SupplierEntry } from "../../../types/index";
import { useAuth } from "../../../hooks/useAuth";
import { useToasts } from "../../../hooks/useToasts";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import Badge from "../../../components/ui/Badge";
import ConfirmationModal from "../../../components/ui/ConfirmationModal";
import { PlusCircleIcon, EditIcon, DeleteIcon } from "../../../components/ui/icons/index";
import { idFactory } from "../../../utils/idFactory";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import AddSupplierModal from "../../../components/ui/AddSupplierModal";

type ItemToDelete = { id: string; type: "log" | "supplier"; name: string };

interface SupplierEntriesCardProps {
  activeShift: ShiftReport;
  onUpdateShift: (updatedShift: ShiftReport) => Promise<void>;
  showSupplierEntryModal: boolean;
  setShowSupplierEntryModal: (show: boolean) => void;
}

const SupplierEntriesCard: React.FC<SupplierEntriesCardProps> = ({
  activeShift,
  onUpdateShift,
  showSupplierEntryModal,
  setShowSupplierEntryModal,
}) => {
  const { currentUser } = useAuth();
  const { addToast } = useToasts();
  const [editingSupplierEntry, setEditingSupplierEntry] = useState<SupplierEntry | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ItemToDelete | null>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const saveSupplierEntry = async (data: Omit<SupplierEntry, "id" | "timestamp">) => {
    const missingFields = [];
    if (!data.time?.trim()) missingFields.push("Hora");
    if (!data.licensePlate?.trim()) missingFields.push("Patente");
    if (!data.driverName?.trim()) missingFields.push("Conductor");
    if (!data.company?.trim()) missingFields.push("Empresa");
    if (!data.reason?.trim()) missingFields.push("Motivo");

    if (missingFields.length > 0 || !currentUser) {
      if (!currentUser) {
        addToast("Sesión no válida. Por favor, reincie.", "error");
      } else {
        addToast(`Faltan campos requeridos: ${missingFields.join(", ")}`, "warning");
      }
      return;
    }

    const newEntry: SupplierEntry = {
      id: editingSupplierEntry ? editingSupplierEntry.id : idFactory.ulid(),
      time: data.time,
      timestamp: editingSupplierEntry ? editingSupplierEntry.timestamp : Date.now(),
      licensePlate: data.licensePlate,
      driverName: data.driverName,
      company: data.company,
      reason: data.reason,
      paxCount: Number(data.paxCount) || 0,
    };

    const updatedSupplierEntries = editingSupplierEntry
      ? activeShift.supplierEntries.map((se) =>
          se.id === editingSupplierEntry!.id ? newEntry : se,
        )
      : [...activeShift.supplierEntries, newEntry];

    const sortedSupplierEntries = updatedSupplierEntries.sort((a, b) => a.timestamp - b.timestamp);
    const updatedShift: ShiftReport = {
      ...activeShift,
      supplierEntries: sortedSupplierEntries,
      lastModified: Date.now(),
      syncStatus: "pending",
    };

    await onUpdateShift(updatedShift);
    addToast(
      editingSupplierEntry
        ? "Registro de proveedor actualizado."
        : "Registro de proveedor agregado.",
      "success",
    );

    setShowSupplierEntryModal(false);
    setEditingSupplierEntry(null);
  };

  const openEditSupplierEntryModal = (entry: SupplierEntry) => {
    setEditingSupplierEntry(entry);
    setShowSupplierEntryModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const updatedShift: ShiftReport = {
      ...activeShift,
      supplierEntries: activeShift.supplierEntries.filter((se) => se.id !== itemToDelete.id),
      lastModified: Date.now(),
      syncStatus: "pending",
    };
    await onUpdateShift(updatedShift);
    addToast("Registro de proveedor eliminado.", "success");
    setItemToDelete(null);
  };

  const renderMobileView = () => (
    <div className="space-y-4 pt-2">
      {activeShift.supplierEntries.length > 0 ? (
        <div className="flex flex-col gap-3">
          {activeShift.supplierEntries.map((se, index) => (
            <motion.div
              key={se.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative p-5 rounded-sm bg-token-surface-card border border-token-border-technical group shadow-sm"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col">
                  <h4 className="text-[15px] font-bold text-token-text-primary tracking-tight uppercase">
                    {se.company}
                  </h4>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge
                      variant="success"
                      size="sm"
                      fontMono
                      className="bg-emerald-600/10 text-emerald-600 border-emerald-600/20"
                    >
                      {se.licensePlate}
                    </Badge>
                    <span className="text-[11px] text-token-text-tertiary font-semibold uppercase tracking-wider">
                      {se.time}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditSupplierEntryModal(se)}
                    className="p-2 rounded-sm text-token-text-tertiary hover:text-emerald-600 hover:bg-emerald-600/10 transition-colors"
                  >
                    <EditIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() =>
                      setItemToDelete({
                        id: se.id,
                        type: "supplier",
                        name: se.company,
                      })
                    }
                    className="p-2 rounded-sm text-token-text-tertiary hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                  >
                    <DeleteIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="bg-token-surface-stripe rounded-sm p-4 space-y-4 border border-token-border-subtle">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-token-text-tertiary uppercase tracking-wider">
                      Conductor
                    </span>
                    <span className="text-[13px] text-token-text-primary font-bold truncate">
                      {se.driverName}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 text-right">
                    <span className="text-[10px] font-semibold text-token-text-tertiary uppercase tracking-wider">
                      Operadores
                    </span>
                    <span className="text-[13px] text-token-text-primary font-bold">
                      {se.paxCount > 0 ? `+${se.paxCount} PAX` : "Individual"}
                    </span>
                  </div>
                </div>
                <div className="pt-3 border-t border-token-border-subtle">
                  <span className="text-[10px] font-semibold text-token-text-tertiary uppercase tracking-wider block mb-1.5">
                    Motivo de Ingreso
                  </span>
                  <p className="text-[12px] text-token-text-secondary font-semibold leading-relaxed">
                    {se.reason}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center bg-token-surface-stripe rounded-sm border border-token-border-technical p-4">
          <p className="text-[11px] font-semibold text-token-text-tertiary uppercase tracking-wider">
            Sin registros de proveedores en este turno
          </p>
        </div>
      )}
    </div>
  );

  const renderDesktopView = () => (
    <div className="overflow-hidden rounded-sm border border-token-border-technical bg-token-surface-card">
      {activeShift.supplierEntries.length > 0 ? (
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-token-surface-stripe">
              <th className="px-6 py-4 text-left border-b border-token-border-technical text-[11px] font-bold text-token-text-tertiary uppercase tracking-wider">
                Hora
              </th>
              <th className="px-6 py-4 text-left border-b border-token-border-technical text-[11px] font-bold text-token-text-tertiary uppercase tracking-wider">
                Empresa / Patente
              </th>
              <th className="px-6 py-4 text-left border-b border-token-border-technical text-[11px] font-bold text-token-text-tertiary uppercase tracking-wider">
                Identificación
              </th>
              <th className="px-6 py-4 text-left border-b border-token-border-technical text-[11px] font-bold text-token-text-tertiary uppercase tracking-wider">
                Motivo Operativo
              </th>
              <th className="px-6 py-4 text-right border-b border-token-border-technical text-[11px] font-bold text-token-text-tertiary uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-token-border-subtle">
            {activeShift.supplierEntries.map((se) => (
              <tr key={se.id} className="group hover:bg-emerald-600/2 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-[13px] font-bold text-token-text-tertiary font-mono w-20">
                  {se.time}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    <span className="text-[13px] font-bold text-token-text-primary uppercase tracking-tight">
                      {se.company}
                    </span>
                    <Badge
                      variant="success"
                      size="sm"
                      fontMono
                      className="bg-emerald-600/10 text-emerald-600 border-emerald-600/20 w-fit"
                    >
                      {se.licensePlate}
                    </Badge>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] text-token-text-primary font-semibold">
                      {se.driverName}
                    </span>
                    {se.paxCount > 0 && (
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                        +{se.paxCount} Acompañantes
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 max-w-xs">
                  <p
                    className="text-[13px] text-token-text-tertiary truncate font-semibold"
                    title={se.reason}
                  >
                    {se.reason}
                  </p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => openEditSupplierEntryModal(se)}
                      className="p-2 rounded-sm text-token-text-tertiary hover:text-emerald-600 hover:bg-emerald-600/10 transition-colors"
                      title="Editar"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        setItemToDelete({
                          id: se.id,
                          type: "supplier",
                          name: se.company,
                        })
                      }
                      className="p-2 rounded-sm text-token-text-tertiary hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                      title="Eliminar"
                    >
                      <DeleteIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="py-12 text-center text-token-text-tertiary font-semibold uppercase tracking-wider text-[12px] bg-token-surface-stripe p-4">
          No hay ingresos de proveedores hoy.
        </div>
      )}
    </div>
  );

  return (
    <>
      <Card className="p-0! flex flex-col overflow-hidden bg-token-surface-card border border-token-border-technical rounded-sm shadow-sm relative">
        <div className="p-6 pb-0 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-1 h-8 bg-emerald-600 rounded-full" />
            <div>
              <h3 className="text-lg font-bold text-token-text-primary tracking-tight uppercase leading-none">
                Control de Proveedores
              </h3>
              <p className="text-[11px] font-semibold text-token-text-tertiary uppercase tracking-wider mt-1.5">
                Acceso vehicular y personal externo
              </p>
            </div>
          </div>

          {!isMobile && (
            <Button
              onClick={() => setShowSupplierEntryModal(true)}
              variant="primary"
              size="sm"
              className="px-6 py-2.5 bg-emerald-600 text-white font-bold uppercase text-[11px] tracking-widest rounded-sm shadow-md shadow-emerald-600/10"
            >
              <PlusCircleIcon className="w-4 h-4" />
              Ingresar Proveedor
            </Button>
          )}
        </div>

        <div className="p-4 sm:p-6 flex-1">
          {isMobile ? renderMobileView() : renderDesktopView()}
        </div>
      </Card>

      <AddSupplierModal
        isOpen={showSupplierEntryModal}
        onClose={() => {
          setShowSupplierEntryModal(false);
          setEditingSupplierEntry(null);
        }}
        onSave={saveSupplierEntry}
        isEditing={!!editingSupplierEntry}
        initialData={editingSupplierEntry}
      />

      {itemToDelete && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setItemToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Confirmar Eliminación"
          message={`¿Eliminar registro para "${itemToDelete.name}"?`}
          confirmText="Sí, Eliminar"
          confirmVariant="danger"
        />
      )}
    </>
  );
};

export default React.memo(SupplierEntriesCard);
