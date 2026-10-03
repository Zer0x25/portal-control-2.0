import React, { useState } from "react";
import { motion } from "framer-motion";
import { ShiftReport, LogbookEntryItem } from "../../../types/index";
import { useAuth } from "../../../hooks/useAuth";
import { useToasts } from "../../../hooks/useToasts";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import Badge from "../../../components/ui/Badge";
import ConfirmationModal from "../../../components/ui/ConfirmationModal";
import { PlusCircleIcon, EditIcon, DeleteIcon } from "../../../components/ui/icons/index";
import { idFactory } from "../../../utils/idFactory";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import AddNoveltyModal from "../../../components/ui/AddNoveltyModal";

type ItemToDelete = { id: string; type: "log" | "supplier"; name: string };

interface LogEntriesCardProps {
  activeShift: ShiftReport;
  onUpdateShift: (updatedShift: ShiftReport) => Promise<void>;
  showLogEntryModal: boolean;
  setShowLogEntryModal: (show: boolean) => void;
}

const LogEntriesCard: React.FC<LogEntriesCardProps> = ({
  activeShift,
  onUpdateShift,
  showLogEntryModal,
  setShowLogEntryModal,
}) => {
  const { currentUser } = useAuth();
  const { addToast } = useToasts();
  const [editingLogEntry, setEditingLogEntry] = useState<LogbookEntryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ItemToDelete | null>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const saveLogEntry = async (annotation: string, time: string) => {
    if (!currentUser) return;
    const newEntry: LogbookEntryItem = {
      id: editingLogEntry ? editingLogEntry.id : idFactory.ulid(),
      time: time,
      annotation: annotation,
      timestamp: editingLogEntry ? editingLogEntry.timestamp : Date.now(),
    };

    const updatedLogEntries = editingLogEntry
      ? activeShift.logEntries.map((le) => (le.id === editingLogEntry!.id ? newEntry : le))
      : [...activeShift.logEntries, newEntry];

    const sortedLogEntries = updatedLogEntries.sort((a, b) => a.timestamp - b.timestamp);
    const updatedShift: ShiftReport = {
      ...activeShift,
      logEntries: sortedLogEntries,
      lastModified: Date.now(),
      syncStatus: "pending",
    };

    await onUpdateShift(updatedShift);
    addToast(editingLogEntry ? "Novedad actualizada." : "Novedad agregada.", "success");

    setShowLogEntryModal(false);
    setEditingLogEntry(null);
  };

  const openEditLogEntryModal = (entry: LogbookEntryItem) => {
    setEditingLogEntry(entry);
    setShowLogEntryModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const updatedShift: ShiftReport = {
      ...activeShift,
      logEntries: activeShift.logEntries.filter((le) => le.id !== itemToDelete.id),
      lastModified: Date.now(),
      syncStatus: "pending",
    };
    await onUpdateShift(updatedShift);
    addToast("Novedad eliminada.", "success");
    setItemToDelete(null);
  };

  const renderMobileView = () => (
    <div className="space-y-4 pt-2">
      {activeShift.logEntries.length > 0 ? (
        <div className="flex flex-col gap-3">
          {activeShift.logEntries.map((le, index) => (
            <motion.div
              key={le.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative p-5 rounded-sm bg-token-surface-card border border-token-border-technical group shadow-sm"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="primary"
                    size="sm"
                    fontMono
                    className="bg-sap-blue/10 text-sap-blue border-sap-blue/20"
                  >
                    {le.time}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditLogEntryModal(le)}
                    className="p-2 rounded-sm text-token-text-tertiary hover:text-sap-blue hover:bg-sap-blue/10 transition-colors"
                  >
                    <EditIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() =>
                      setItemToDelete({
                        id: le.id,
                        type: "log",
                        name: le.annotation.substring(0, 30),
                      })
                    }
                    className="p-2 rounded-sm text-token-text-tertiary hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                  >
                    <DeleteIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-[13px] font-semibold text-token-text-primary whitespace-pre-wrap leading-relaxed">
                {le.annotation}
              </p>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center bg-token-surface-stripe rounded-sm border border-token-border-technical p-4">
          <p className="text-[11px] font-semibold text-token-text-tertiary uppercase tracking-wider">
            Sin registros operativos en este turno
          </p>
        </div>
      )}
    </div>
  );

  const renderDesktopView = () => (
    <div className="overflow-hidden rounded-sm border border-token-border-technical bg-token-surface-card">
      {activeShift.logEntries.length > 0 ? (
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-token-surface-stripe">
              <th className="px-6 py-4 text-left border-b border-token-border-technical text-[11px] font-bold text-token-text-tertiary uppercase tracking-wider">
                Hora
              </th>
              <th className="px-6 py-4 text-left border-b border-token-border-technical text-[11px] font-bold text-token-text-tertiary uppercase tracking-wider">
                Anotación Operativa
              </th>
              <th className="px-6 py-4 text-right border-b border-token-border-technical text-[11px] font-bold text-token-text-tertiary uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-token-border-subtle">
            {activeShift.logEntries.map((le) => (
              <tr key={le.id} className="group hover:bg-sap-blue/2 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-[13px] font-bold text-sap-blue font-mono w-24">
                  {le.time}
                </td>
                <td className="px-6 py-4 text-[13px] text-token-text-primary font-semibold leading-relaxed">
                  {le.annotation}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => openEditLogEntryModal(le)}
                      className="p-2 rounded-sm text-token-text-tertiary hover:text-sap-blue hover:bg-sap-blue/10 transition-colors"
                      title="Editar Novedad"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        setItemToDelete({
                          id: le.id,
                          type: "log",
                          name: le.annotation.substring(0, 30),
                        })
                      }
                      className="p-2 rounded-sm text-token-text-tertiary hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                      title="Eliminar Novedad"
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
        <div className="py-12 text-center text-token-text-tertiary font-semibold text-[12px] bg-token-surface-stripe p-4 uppercase tracking-wider">
          No hay novedades registradas en este turno.
        </div>
      )}
    </div>
  );

  return (
    <>
      <Card className="p-0! flex flex-col overflow-hidden bg-token-surface-card border border-token-border-technical rounded-sm shadow-sm relative">
        <div className="p-6 pb-0 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-1 h-8 bg-sap-blue rounded-full" />
            <div>
              <h3 className="text-lg font-bold text-token-text-primary tracking-tight uppercase leading-none">
                Bitácora de Novedades
              </h3>
              <p className="text-[11px] font-semibold text-token-text-tertiary uppercase tracking-wider mt-1.5">
                Registro de eventos críticos del turno
              </p>
            </div>
          </div>

          {!isMobile && (
            <Button
              onClick={() => setShowLogEntryModal(true)}
              variant="primary"
              size="sm"
              className="px-6 py-2.5 bg-sap-blue text-white font-bold uppercase text-[11px] tracking-widest rounded-sm shadow-md shadow-sap-blue/10"
            >
              <PlusCircleIcon className="w-4 h-4" />
              Ingresar Novedad
            </Button>
          )}
        </div>

        <div className="p-4 sm:p-6 flex-1">
          {isMobile ? renderMobileView() : renderDesktopView()}
        </div>
      </Card>
      <AddNoveltyModal
        isOpen={showLogEntryModal}
        onClose={() => {
          setShowLogEntryModal(false);
          setEditingLogEntry(null);
        }}
        onSave={saveLogEntry}
        isEditing={!!editingLogEntry}
        initialText={editingLogEntry?.annotation}
        initialTime={editingLogEntry?.time}
      />
      {itemToDelete && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setItemToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Confirmar Eliminación"
          message={`¿Eliminar la novedad "${itemToDelete.name}..."?`}
          confirmText="Sí, Eliminar"
          confirmVariant="danger"
        />
      )}
    </>
  );
};

export default React.memo(LogEntriesCard);
