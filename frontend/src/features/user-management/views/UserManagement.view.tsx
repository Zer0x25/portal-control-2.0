import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../../../components/ui/Button";
import ConfirmationModal from "../../../components/ui/ConfirmationModal";
import {
  PlusCircleIcon,
  KeyIcon,
  EditIcon,
  DeleteIcon,
  ShieldIcon,
} from "../../../components/ui/icons/index";
import PageHeader from "../../../components/ui/PageHeader";
import Card from "../../../components/ui/Card";
import UserForm from "../components/UserForm";
import MFASetupModal from "../../../features/auth/components/MFASetupModal";
import CinematicModal from "../../../components/ui/CinematicModal";
import PremiumSearchInput from "../../../components/ui/PremiumSearchInput";
import RoleBadge from "../../../components/ui/RoleBadge";
import type { Employee, User, UserRole } from "../../../types";

interface UserFormData {
  username: string;
  password?: string;
  role: UserRole;
  employeeId?: string;
}

export interface UserManagementViewProps {
  isEmbedded?: boolean;
  allUsers: User[];
  activeEmployees: Employee[];
  currentUser: User | null;
  isLoadingUsers: boolean;
  isFormVisible: boolean;
  editingUser: User | null;
  userToDelete: User | null;
  userToResetPin: User | null;
  userToResetPassword: User | null;
  searchTerm: string;
  isMFASetupOpen: boolean;
  isMobile: boolean;
  paginatedUsers: User[];
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  setScrollRoot: React.Dispatch<React.SetStateAction<HTMLDivElement | null>>;
  canManageUser: (user: User) => boolean;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  handleOpenNewForm: () => void;
  handleEditUser: (user: User) => void;
  handleSaveUser: (data: UserFormData) => Promise<void>;
  setIsFormVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setIsMFASetupOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setUserToDelete: React.Dispatch<React.SetStateAction<User | null>>;
  setUserToResetPin: React.Dispatch<React.SetStateAction<User | null>>;
  setUserToResetPassword: React.Dispatch<React.SetStateAction<User | null>>;
  handleDeleteUser: () => Promise<void>;
  handleConfirmResetPassword: () => Promise<void>;
  handleConfirmResetPin: () => Promise<void>;
  refreshUsers: () => void;
}

/* UI-PROTECTED: EDIT ONLY WITH HUMAN APPROVAL
   Presentational layer for User Management.
*/
export const UserManagementView: React.FC<UserManagementViewProps> = (props) => {
  const {
    isEmbedded,
    allUsers,
    activeEmployees,
    currentUser,
    isLoadingUsers,
    isFormVisible,
    editingUser,
    userToDelete,
    userToResetPin,
    userToResetPassword,
    searchTerm,
    isMFASetupOpen,
    isMobile,
    paginatedUsers,
    sentinelRef,
    setScrollRoot,
    canManageUser,
    setSearchTerm,
    handleOpenNewForm,
    handleEditUser,
    handleSaveUser,
    setIsFormVisible,
    setIsMFASetupOpen,
    setUserToDelete,
    setUserToResetPin,
    setUserToResetPassword,
    handleDeleteUser,
    handleConfirmResetPassword,
    handleConfirmResetPin,
    refreshUsers,
  } = props;

  const renderDesktopView = () => (
    <div className="border border-token-border-technical rounded-sm shadow-sm w-full overflow-hidden">
      <table className="min-w-full divide-y divide-token-border-technical border-separate border-spacing-0">
        <thead className="bg-token-surface-header sticky top-0 z-20 backdrop-blur-md shadow-sm border-b border-token-border-technical">
          <tr className="text-token-text-secondary text-[11px] font-bold uppercase tracking-wider">
            <th className="px-6 py-4 text-left border-b border-token-border-subtle">Acceso</th>
            <th className="px-6 py-4 text-left border-b border-token-border-subtle">Jerarquía</th>
            <th className="px-6 py-4 text-left border-b border-token-border-subtle">Vinculación</th>
            <th className="px-6 py-4 text-right border-b border-token-border-subtle">Acciones</th>
          </tr>
        </thead>
        <tbody className="bg-token-surface-card divide-y divide-token-border-subtle">
          <AnimatePresence>
            {paginatedUsers.map((user) => (
              <motion.tr
                key={user.id}
                layout
                className="group hover:bg-token-surface-active transition-all"
              >
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-token-text-primary uppercase tracking-tight">
                      {user.username}
                    </span>
                    {user.mfaEnabled && (
                      <div className="flex items-center gap-1.5 w-fit mt-1 px-1.5 py-0.5 bg-[var(--status-success)]/10 border border-[var(--status-success)]/20 rounded-sm">
                        <ShieldIcon className="w-2.5 h-2.5 text-[var(--status-success)]" />
                        <span className="text-[8px] font-bold text-[var(--status-success)] uppercase tracking-widest">
                          MFA PROTECTED
                        </span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <RoleBadge role={user.role} size="md" />
                </td>
                <td className="px-6 py-4">
                  {user.employeeId ? (
                    <span className="text-[11px] font-semibold text-token-text-secondary uppercase">
                      {activeEmployees.find((e) => e.id === user.employeeId)?.name || "—"}
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-token-text-tertiary uppercase opacity-40">
                      Sin Vinculación
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {canManageUser(user) ? (
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => handleEditUser(user)}
                        className="bg-token-surface-card border-token-border-technical"
                      >
                        <EditIcon className="w-4 h-4 text-[var(--sidebar-text-active)]" />
                      </Button>
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => setUserToResetPassword(user)}
                        className="bg-token-surface-card border-token-border-technical"
                      >
                        <KeyIcon className="w-4 h-4 text-[var(--status-warning)]" />
                      </Button>
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => setUserToResetPin(user)}
                        disabled={!user.employeeId}
                        className="bg-token-surface-card border-token-border-technical disabled:opacity-30"
                      >
                        <ShieldIcon className="w-4 h-4 text-token-text-tertiary" />
                      </Button>
                      {currentUser?.id === user.id && !user.mfaEnabled && (
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => setIsMFASetupOpen(true)}
                          className="bg-indigo-600/10 border border-indigo-500/20"
                        >
                          <ShieldIcon className="w-4 h-4 text-indigo-600" />
                        </Button>
                      )}
                      <Button
                        size="xs"
                        variant="danger"
                        onClick={() => setUserToDelete(user)}
                        className="bg-[var(--status-error)]/10 text-[var(--status-error)] border border-[var(--status-error)]/20"
                      >
                        <DeleteIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-[10px] uppercase font-bold text-token-text-tertiary">
                      Solo Lectura
                    </span>
                  )}
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );

  const renderMobileView = () => (
    <div className="space-y-4">
      {paginatedUsers.map((user) => (
        <div
          key={user.id}
          className="p-5 bg-token-surface-card border border-token-border-technical rounded-sm relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-[var(--sidebar-text-active)]" />
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-bold text-token-text-primary uppercase">
                {user.username}
              </h3>
              <div className="flex gap-2 mt-2">
                <RoleBadge role={user.role} size="xs" />
              </div>
            </div>
            {canManageUser(user) && (
              <div className="flex gap-2">
                <Button size="xs" variant="secondary" onClick={() => handleEditUser(user)}>
                  <EditIcon className="w-4 h-4" />
                </Button>
                <Button size="xs" variant="danger" onClick={() => setUserToDelete(user)}>
                  <DeleteIcon className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500" data-ui-protected>
      {!isEmbedded && (
        <PageHeader
          eyebrow="Seguridad"
          eyebrowIcon={<KeyIcon className="w-3.5 h-3.5" />}
          icon={<ShieldIcon className="w-4 h-4" />}
          title="Gestión de Accesos"
          subtitle="Control maestro de perfiles y permisos operativos"
          actions={
            <Button
              onClick={handleOpenNewForm}
              className="px-6 h-11 bg-[var(--sidebar-text-active)] text-white font-bold uppercase text-[11px] tracking-widest shadow-lg shadow-[var(--sidebar-text-active)]/20 rounded-sm"
            >
              <PlusCircleIcon className="w-5 h-5 mr-2" /> Nuevo Usuario
            </Button>
          }
        />
      )}

      <Card variant="premium" noPadding className="border-token-border-technical overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="p-4 mb-6 bg-token-surface-stripe border border-token-border-technical rounded-sm">
            <PremiumSearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar por usuario o personal..."
              shortcut="/"
            />
          </div>

          <div
            ref={setScrollRoot}
            className="h-[500px] overflow-y-auto bg-token-surface-stripe custom-scrollbar rounded-sm border border-token-border-technical"
          >
            {isMobile ? renderMobileView() : renderDesktopView()}
            <div ref={sentinelRef} className="py-10 text-center">
              {isLoadingUsers && (
                <span className="text-[10px] font-bold uppercase text-[var(--sidebar-text-active)] animate-pulse">
                  Sincronizando...
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      <CinematicModal
        isOpen={isFormVisible}
        onClose={() => setIsFormVisible(false)}
        title={
          <div className="flex items-center gap-3">
            <ShieldIcon className="w-5 h-5 text-[var(--sidebar-text-active)]" />{" "}
            <span className="font-bold uppercase tracking-tight">Configuración de Usuario</span>
          </div>
        }
      >
        <UserForm
          isFormVisible={isFormVisible}
          onCancel={() => setIsFormVisible(false)}
          onSave={handleSaveUser}
          editingUser={editingUser}
          activeEmployees={activeEmployees}
          currentUserRole={currentUser?.role || "Usuario"}
          existingUsers={allUsers}
        />
      </CinematicModal>

      <MFASetupModal
        isOpen={isMFASetupOpen}
        onClose={() => setIsMFASetupOpen(false)}
        onSuccess={() => {
          setIsMFASetupOpen(false);
          refreshUsers();
        }}
      />

      <ConfirmationModal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleDeleteUser}
        title="Eliminar Usuario"
        message="¿Está seguro de eliminar este acceso?"
        confirmVariant="danger"
      />
      <ConfirmationModal
        isOpen={!!userToResetPassword}
        onClose={() => setUserToResetPassword(null)}
        onConfirm={handleConfirmResetPassword}
        title="Resetear Contraseña"
        message="Se restablecerá a '123456'."
        confirmVariant="primary"
      />
      <ConfirmationModal
        isOpen={!!userToResetPin}
        onClose={() => setUserToResetPin(null)}
        onConfirm={handleConfirmResetPin}
        title="Resetear PIN Kiosco"
        message="¿Restablecer PIN a valores por defecto?"
        confirmVariant="danger"
      />
    </div>
  );
};
