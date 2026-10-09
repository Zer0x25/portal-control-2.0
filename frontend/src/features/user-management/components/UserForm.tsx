import React, { useState, useEffect, useMemo } from "react";
import { User, UserRole, Employee } from "../../../types/index";
import { useToasts } from "../../../hooks/useToasts";
import { normalizeString } from "../../../utils/stringUtils";
import { USER_ROLES, ROLE_HIERARCHY } from "../../../utils/mappings";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";

interface UserFormProps {
  isFormVisible: boolean;
  onCancel: () => void;
  onSave: (data: UserFormData) => void;
  editingUser: User | null;
  activeEmployees: Employee[];
  currentUserRole: UserRole;
  existingUsers: User[];
}

interface UserFormData {
  username: string;
  password?: string;
  role: UserRole;
  employeeId?: string;
}

const UserForm: React.FC<UserFormProps> = ({
  isFormVisible,
  onCancel,
  onSave,
  editingUser,
  activeEmployees,
  currentUserRole,
  existingUsers,
}) => {
  const { addToast } = useToasts();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("Usuario");
  const [employeeId, setEmployeeId] = useState<string | undefined>("");

  useEffect(() => {
    if (editingUser) {
      setUsername(editingUser.username);
      setRole(editingUser.role);
      setEmployeeId(editingUser.employeeId);
      setPassword("");
    } else {
      setUsername("");
      setPassword("");
      setRole("Usuario");
      setEmployeeId("");
    }
  }, [editingUser, isFormVisible]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ username, password, role, employeeId });
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const originalValue = e.target.value;
    const normalizedValue = normalizeString(originalValue);
    setUsername(normalizedValue);

    if (originalValue !== normalizedValue) {
      addToast(
        "Los nombres de usuario no pueden contener tildes y se han normalizado.",
        "info",
        3000,
      );
    }
  };

  const roleOptions = useMemo(
    () =>
      USER_ROLES.filter((r) => ROLE_HIERARCHY[currentUserRole] >= ROLE_HIERARCHY[r]).map((r) => ({
        value: r,
        label: r,
      })),
    [currentUserRole],
  );

  const employeeOptions = useMemo(
    () => [
      { value: "", label: "-- SIN ASIGNAR --" },
      ...activeEmployees
        .filter(
          (emp) => !existingUsers.some((u) => u.employeeId === emp.id && u.id !== editingUser?.id),
        )
        .map((e) => ({ value: e.id, label: e.name })),
    ],
    [activeEmployees, existingUsers, editingUser],
  );

  if (!isFormVisible) return null;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-widest text-token-text-secondary ml-1">
              Nombre de Usuario
            </label>
            <Input
              value={username}
              onChange={handleUsernameChange}
              required
              disabled={!!editingUser}
              className="mb-0! font-black"
              placeholder="Ej: j.perez"
            />
          </div>
          {!editingUser && (
            <div className="flex flex-col justify-center px-6 py-4 bg-linear-to-br from-token-surface-stripe to-token-surface-card border border-token-border-technical rounded-md shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-sap-blue/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-token-text-tertiary">
                Contraseña Temporal
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-token-text-primary tabular-nums tracking-tighter">
                  123456
                </span>
                <span className="text-[9px] font-black text-sap-blue uppercase tracking-tighter">
                  * Cambio Obligatorio
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Nivel de Autorización"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            options={roleOptions}
          />
          <Select
            label="Empleado Vinculado (Opcional)"
            value={employeeId || ""}
            onChange={(e) => setEmployeeId(e.target.value || undefined)}
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
            className="px-10 py-2.5 text-[10px] uppercase tracking-widest"
          >
            {editingUser ? "Sincronizar" : "Registrar Acceso"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default UserForm;
