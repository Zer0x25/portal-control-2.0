import React, { useState, useEffect } from "react";
import { User, UserRole, Employee } from "../../../types/index";
import { useToasts } from "../../../hooks/useToasts";
import { normalizeString } from "../../../utils/stringUtils";
import { USER_ROLES, ROLE_HIERARCHY } from "../../../utils/mappings";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";

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
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-widest text-token-text-secondary ml-1">
              Nivel de Autorización
            </label>
            <div className="relative group">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-4 py-3 bg-token-surface-card border border-token-border-technical rounded-md focus:ring-4 focus:ring-sap-blue/5 focus:border-sap-blue outline-none transition-all text-token-text-primary font-black uppercase tracking-tight text-sm cursor-pointer shadow-sm appearance-none hover:bg-token-surface-hover"
              >
                {USER_ROLES.filter((r) => ROLE_HIERARCHY[currentUserRole] >= ROLE_HIERARCHY[r]).map(
                  (r) => (
                    <option key={r} value={r} className="bg-white dark:bg-gray-900">
                      {r}
                    </option>
                  ),
                )}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-token-text-tertiary group-hover:text-sap-blue transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-widest text-token-text-secondary ml-1">
              Empleado Vinculado (Opcional)
            </label>
            <div className="relative group">
              <select
                value={employeeId || ""}
                onChange={(e) => setEmployeeId(e.target.value || undefined)}
                className="w-full px-4 py-3 bg-token-surface-card border border-token-border-technical rounded-md focus:ring-4 focus:ring-sap-blue/5 focus:border-sap-blue outline-none transition-all text-token-text-primary font-black uppercase tracking-tight text-sm cursor-pointer shadow-sm appearance-none hover:bg-token-surface-hover"
              >
                <option value="" className="bg-white dark:bg-gray-900">
                  -- SIN ASIGNAR --
                </option>
                {activeEmployees
                  .filter(
                    (emp) =>
                      !existingUsers.some(
                        (u) => u.employeeId === emp.id && u.id !== editingUser?.id,
                      ),
                  )
                  .map((e) => (
                    <option key={e.id} value={e.id} className="bg-white dark:bg-gray-900">
                      {e.name}
                    </option>
                  ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-token-text-tertiary group-hover:text-sap-blue transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-token-border-subtle mt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="px-8 py-2.5 rounded-md font-black text-[10px] uppercase tracking-widest bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-black/5 dark:border-white/5 shadow-sm transition-all"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="px-10 py-2.5 rounded-md bg-sap-blue hover:bg-sap-blue/90 border-none shadow-md transition-all font-black text-[10px] uppercase tracking-widest"
          >
            {editingUser ? "Sincronizar" : "Registrar Acceso"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default UserForm;
