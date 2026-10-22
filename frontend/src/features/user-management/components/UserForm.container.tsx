import React from "react";

import UserFormView from "./UserForm.view";
import { useUserFormController } from "../hooks/useUserFormController";
import type { UserFormValues } from "../../../schemas/forms/user";
import type { Employee, User, UserRole } from "../../../types/index";

/**
 * Spec 036 T9: el container del formulario de usuario.
 *
 * Es el unico punto donde vive el estado del formulario: el container
 * instancia el hook de dominio y se lo pasa a la vista (que es presentacion
 * pura). El patron es el de la spec 033 (`*.container.tsx` + `*.view.tsx`).
 */
export interface UserFormContainerProps {
  /** Usuario en edicion (`null` cuando se da de alta uno nuevo). */
  editingUser: User | null;
  /** El formulario esta visible. */
  isFormVisible: boolean;
  /** Empleados activos (para el desplegable de vinculo). */
  activeEmployees: readonly Employee[];
  /** Rol del usuario en sesion. */
  currentUserRole: UserRole;
  /** Usuarios ya registrados. */
  existingUsers: readonly User[];
  /** Guarda el usuario. */
  onSave: (values: UserFormValues) => void | Promise<void>;
  /** Cancela el alta o la edicion. */
  onCancel: () => void;
}

const UserFormContainer: React.FC<UserFormContainerProps> = ({
  editingUser,
  isFormVisible,
  activeEmployees,
  currentUserRole,
  existingUsers,
  onSave,
  onCancel,
}) => {
  const controller = useUserFormController({
    editingUser,
    isFormVisible,
    activeEmployees,
    currentUserRole,
    existingUsers,
    onSave,
    onCancel,
  });

  return (
    <UserFormView
      values={controller.values}
      getError={controller.getError}
      formError={controller.formError}
      setValue={controller.setValue}
      handleUsernameChange={controller.handleUsernameChange}
      roleOptions={controller.roleOptions}
      employeeOptions={controller.employeeOptions}
      isEditing={controller.isEditing}
      isSubmitting={controller.isSubmitting}
      formProps={controller.formProps}
      onCancel={controller.onCancel}
    />
  );
};

export default UserFormContainer;
