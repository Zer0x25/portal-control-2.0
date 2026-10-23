import React from "react";

import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import type { UserFormValues } from "../../../schemas/forms/user";
import type { UserRole } from "../../../types/index";

/**
 * Spec 036 T9: `UserForm` es **presentacion pura**.
 *
 * Antes el componente guardaba el estado de los campos y normalizaba el
 * nombre de usuario: la capa de componentes gestionaba estado, justo lo que
 * la spec 033 prohibe. Ahora los valores, los errores y los handlers entran
 * por props (los lleva el hook de dominio).
 */
export interface UserFormViewProps {
  /** Valores actuales del formulario. */
  values: UserFormValues;
  /** Mensaje de error de un campo (o `undefined`). */
  getError: (field: string) => string | undefined;
  /** Error de formulario (reglas que no pertenecen a un campo concreto). */
  formError?: string;
  /** Escribe el valor de un campo. */
  setValue: <K extends keyof UserFormValues & string>(name: K, value: UserFormValues[K]) => void;
  /** Escribe el nombre de usuario ya normalizado (sin tildes). */
  handleUsernameChange: (value: string) => void;
  /** Roles que puede asignar el usuario en sesion. */
  roleOptions: { value: string; label: string }[];
  /** Empleados que todavia no estan vinculados a otro usuario. */
  employeeOptions: { value: string; label: string }[];
  /** Se esta editando un usuario. */
  isEditing: boolean;
  /** Hay un envio en vuelo. */
  isSubmitting: boolean;
  /** Props del `<form>` (id, `noValidate` y `onSubmit` de la capa). */
  formProps: {
    id: string;
    noValidate: true;
    onSubmit: (event: { preventDefault: () => void }) => void;
    "data-app-form": string;
  };
  /** Cancela el alta o la edicion. */
  onCancel: () => void;
}

const UserFormView: React.FC<UserFormViewProps> = ({
  values,
  getError,
  formError,
  setValue,
  handleUsernameChange,
  roleOptions,
  employeeOptions,
  isEditing,
  isSubmitting,
  formProps,
  onCancel,
}) => {
  const usernameError = getError("username");
  const roleError = getError("role");
  const employeeIdError = getError("employeeId");

  return (
    <div className="space-y-6">
      <form {...formProps} className="space-y-6">
        {formError && (
          <p
            role="alert"
            className="text-[10px] font-black uppercase tracking-widest text-token-status-error"
          >
            {formError}
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label
              htmlFor="userUsername"
              className="block text-[10px] font-black uppercase tracking-widest text-token-text-secondary ml-1"
            >
              Nombre de Usuario
            </label>
            <Input
              id="userUsername"
              value={values.username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              error={usernameError}
              required
              disabled={isEditing}
              className="mb-0! font-black"
              placeholder="Ej: j.perez"
            />
          </div>
          {!isEditing && (
            <div className="flex flex-col justify-center px-6 py-4 bg-linear-to-br from-token-surface-stripe to-token-surface-card border border-token-border-technical rounded-md shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-token-accent-brand/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-token-text-tertiary">
                Contraseña Temporal
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-token-text-primary tabular-nums tracking-tighter">
                  123456
                </span>
                <span className="text-xxs font-black text-token-accent-brand uppercase tracking-tighter">
                  * Cambio Obligatorio
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Nivel de Autorización"
            id="userRole"
            value={values.role}
            onChange={(e) => setValue("role", e.target.value as UserRole)}
            error={roleError}
            options={roleOptions}
          />
          <Select
            label="Empleado Vinculado (Opcional)"
            id="userEmployeeId"
            value={values.employeeId || ""}
            onChange={(e) => setValue("employeeId", e.target.value || undefined)}
            error={employeeIdError}
            options={employeeOptions}
          />
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-token-border-subtle mt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="px-8 py-2.5 text-[10px] uppercase tracking-widest"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="px-10 py-2.5 text-[10px] uppercase tracking-widest"
          >
            {isEditing ? "Sincronizar" : "Registrar Acceso"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default UserFormView;
