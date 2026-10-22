import { useCallback, useEffect, useMemo } from "react";

import { useAppForm } from "../../../hooks/useAppForm";
import { useToasts } from "../../../hooks/useToasts";
import { normalizeString } from "../../../utils/stringUtils";
import { ROLE_HIERARCHY, USER_ROLES } from "../../../utils/mappings";
import { buildUserFormSchema, type UserFormValues } from "../../../schemas/forms/user";
import type { Employee, User, UserRole } from "../../../types/index";

/**
 * Spec 036 T9 (AC1, AC2, AC3): formulario de **alta y edicion de usuario**.
 *
 * Antes el componente tenia cuatro `useState` (`username`, `password`, `role`,
 * `employeeId`), un `useEffect` que los reiniciaba y ninguna validacion: los
 * errores los mostraba un `addToast` del padre. Ahora:
 *
 * - el estado de los campos vive en `useAppForm` (spec 036 AC1);
 * - las reglas viven en el schema (`buildUserFormSchema`): el usuario y la
 *   contraseña del alta (spec 036 AC2);
 * - los errores salen junto al campo, con su mensaje en el mapa central
 *   (spec 036 AC3).
 *
 * El formulario **no** valida que el nombre de usuario sea unico (eso es una
 * regla del backend) ni que el empleado este libre (eso es una regla de la
 * lista de opciones, no del formulario).
 */

/** Opciones del hook del formulario de usuario. */
export interface UseUserFormControllerOptions {
  /** Usuario en edicion (`null` cuando se da de alta uno nuevo). */
  readonly editingUser: User | null;
  /** El formulario esta visible (reinicia el estado al abrirse). */
  readonly isFormVisible: boolean;
  /** Empleados activos (para el desplegable de vinculo). */
  readonly activeEmployees: readonly Employee[];
  /** Rol del usuario en sesion (limita los roles que se pueden asignar). */
  readonly currentUserRole: UserRole;
  /** Usuarios ya registrados (un empleado no puede estar en dos usuarios). */
  readonly existingUsers: readonly User[];
  /** Guarda el usuario (recibe los valores ya validados). */
  readonly onSave: (values: UserFormValues) => void | Promise<void>;
  /** Cancela el alta o la edicion. */
  readonly onCancel: () => void;
}

/** Valores iniciales del formulario a partir del usuario en edicion. */
const toFormValues = (editingUser: User | null): UserFormValues => ({
  username: editingUser?.username ?? "",
  password: editingUser ? undefined : "",
  role: editingUser?.role ?? "Usuario",
  employeeId: editingUser?.employeeId ?? "",
});

/** Controlador del formulario de usuario (spec 036 T9). */
export const useUserFormController = ({
  editingUser,
  isFormVisible,
  activeEmployees,
  currentUserRole,
  existingUsers,
  onSave,
  onCancel,
}: UseUserFormControllerOptions) => {
  const { addToast } = useToasts();

  const isEditing = editingUser !== null;

  /**
   * Schema con la regla que depende del contexto (en el alta la contraseña es
   * obligatoria; en la edicion no se toca).
   */
  const schema = useMemo(() => buildUserFormSchema({ isEditing }), [isEditing]);

  const form = useAppForm<UserFormValues>({
    schema,
    defaultValues: toFormValues(editingUser),
    onSubmit: async (values) => {
      await onSave(values);
    },
  });

  const { setValue, reset } = form;

  /**
   * El formulario se reinicia con los datos del usuario en edicion (o con los
   * vacios cuando se da de alta uno nuevo) cada vez que se abre.
   */
  useEffect(() => {
    if (!isFormVisible) return;
    reset(toFormValues(editingUser));
  }, [editingUser, isFormVisible, reset]);

  /**
   * El nombre de usuario no puede llevar tildes: se normaliza mientras se
   * escribe y se avisa con un aviso informativo (regla de la pantalla).
   */
  const handleUsernameChange = useCallback(
    (value: string) => {
      const normalizedValue = normalizeString(value);
      setValue("username", normalizedValue);

      if (value !== normalizedValue) {
        addToast(
          "Los nombres de usuario no pueden contener tildes y se han normalizado.",
          "info",
          3000,
        );
      }
    },
    [addToast, setValue],
  );

  /** Roles que puede asignar el usuario en sesion. */
  const roleOptions = useMemo(
    () =>
      USER_ROLES.filter((role) => ROLE_HIERARCHY[currentUserRole] >= ROLE_HIERARCHY[role]).map(
        (role) => ({ value: role, label: role }),
      ),
    [currentUserRole],
  );

  /** Empleados que todavia no estan vinculados a otro usuario. */
  const employeeOptions = useMemo(
    () => [
      { value: "", label: "-- SIN ASIGNAR --" },
      ...activeEmployees
        .filter(
          (emp) => !existingUsers.some((u) => u.employeeId === emp.id && u.id !== editingUser?.id),
        )
        .map((emp) => ({ value: emp.id, label: emp.name })),
    ],
    [activeEmployees, existingUsers, editingUser],
  );

  return {
    values: form.values,
    getError: form.getError,
    formError: form.formError,
    setValue,
    handleUsernameChange,
    roleOptions,
    employeeOptions,
    isEditing,
    isSubmitting: form.isSubmitting,
    submit: form.submit,
    formProps: form.formProps,
    onCancel,
  };
};
