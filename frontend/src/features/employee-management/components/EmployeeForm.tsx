import React, { useState, useMemo, Dispatch, SetStateAction } from "react";
import { Employee } from "../../../types/index";
import { useToasts } from "../../../hooks/useToasts";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Switch from "../../../components/ui/Switch";
import { isValidChileanRut } from "../../../utils/validation";

type EditableEmployeeData = Partial<
  Pick<Employee, "name" | "rut" | "position" | "area" | "workdayType" | "email" | "pin">
> & {
  createUserAccount?: boolean;
};

interface EmployeeFormProps {
  onSave: () => Promise<boolean>;
  onCancel: () => void;
  employeeData: EditableEmployeeData;
  setEmployeeData: Dispatch<SetStateAction<EditableEmployeeData>>;
  isEditing: boolean;
  nextEmployeeId: string;
  existingEmployees: Employee[];
  employeeIdToEdit?: string;
  areaList: string[];
  workdayTypeList: string[];
  hasLinkedUser: boolean;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({
  onSave,
  onCancel,
  employeeData,
  setEmployeeData,
  isEditing,
  nextEmployeeId,
  existingEmployees,
  employeeIdToEdit,
  areaList,
  workdayTypeList,
  hasLinkedUser,
}) => {
  const [rutError, setRutError] = useState("");
  const [emailError, setEmailError] = useState("");
  const { addToast } = useToasts();

  const dropdownAreaOptions = useMemo(() => {
    const currentArea = employeeData.area || "";
    const combinedList = [...new Set([currentArea, ...areaList])].filter(Boolean);
    return combinedList.sort((a, b) => a.localeCompare(b));
  }, [areaList, employeeData.area]);

  const dropdownWorkdayTypeOptions = useMemo(() => {
    const currentType = employeeData.workdayType || "";
    const combinedList = [...new Set([currentType, ...workdayTypeList])].filter(Boolean);
    return combinedList.sort((a, b) => a.localeCompare(b));
  }, [workdayTypeList, employeeData.workdayType]);

  const validateEmail = (email: string | undefined): boolean => {
    if (!email || email.trim() === "") {
      setEmailError("");
      return true;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Formato de email inválido.");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmployeeData((prev) => ({ ...prev, email: e.target.value }));
    validateEmail(e.target.value);
  };

  const validateAndSetRut = (rutInput: string) => {
    let value = rutInput.toUpperCase().replace(/[^0-9Kk-]/g, "");
    let formattedRut = "";
    const parts = value.split("-");
    const body = parts[0].replace(/[^0-9]/g, "").slice(0, 8);
    let dv = parts.length > 1 ? parts[1].replace(/[^0-9Kk]/g, "").slice(0, 1) : "";

    if (body) {
      formattedRut = body;
      if (dv || value.includes("-")) {
        formattedRut += "-" + dv;
      }
    } else if (value.includes("-")) {
      formattedRut = "-" + dv;
    } else {
      formattedRut = dv;
    }

    setEmployeeData((prev) => ({ ...prev, rut: formattedRut }));

    if (formattedRut.length === 0) {
      setRutError("");
      return true;
    }

    const isDuplicate = existingEmployees.some(
      (emp) => emp.rut === formattedRut && emp.id !== employeeIdToEdit,
    );
    if (isDuplicate) {
      setRutError("Error: RUT ya Registrado.");
      return false;
    }

    if (formattedRut === "11111111-1") {
      setRutError("");
      return true;
    }

    if (!isValidChileanRut(formattedRut)) {
      setRutError("RUT inválido. Verifique el dígito verificador.");
      return false;
    }

    setRutError("");
    return true;
  };

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndSetRut(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !employeeData.name?.trim() ||
      !employeeData.position?.trim() ||
      !employeeData.area?.trim() ||
      !employeeData.rut?.trim() ||
      !employeeData.workdayType?.trim()
    ) {
      addToast(
        "Todos los campos (Nombre, RUT, Cargo, Área, Tipo Jornada) son requeridos.",
        "warning",
      );
      return;
    }

    if (!validateEmail(employeeData.email)) {
      addToast("Por favor, corrija el formato del email.", "error");
      return;
    }

    if (!validateAndSetRut(employeeData.rut || "")) {
      addToast(rutError || "El RUT ingresado no es válido o ya está registrado.", "error");
      return;
    }
    await onSave();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {!isEditing && (
          <div className="flex justify-end mb-4">
            <div className="px-4 py-2 bg-sap-blue/5 dark:bg-sap-blue/10 rounded-md border border-sap-blue/20 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-sap-blue" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sap-blue">
                ID ASIGNADO:{" "}
                <span className="text-token-text-primary ml-1 font-mono">
                  #{nextEmployeeId || "..."}
                </span>
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-token-text-secondary uppercase tracking-[0.2em] ml-1">
              NOMBRE COMPLETO
            </label>
            <Input
              id="employeeName"
              type="text"
              value={employeeData.name || ""}
              onChange={(e) => setEmployeeData((prev) => ({ ...prev, name: e.target.value }))}
              required
              placeholder="Ej: Juan Pérez"
              className="mb-0! font-bold uppercase text-xs tracking-wide"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-token-text-secondary uppercase tracking-[0.2em] ml-1">
              RUT
            </label>
            <Input
              id="employeeRut"
              type="text"
              value={employeeData.rut || ""}
              onChange={handleRutChange}
              required
              placeholder="Ej: 12345678-9"
              maxLength={10}
              error={rutError}
              className="mb-0! font-mono font-bold uppercase text-xs tracking-wide"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-token-text-secondary uppercase tracking-[0.2em] ml-1">
              CARGO OPERATIVO
            </label>
            <Input
              id="employeePosition"
              type="text"
              value={employeeData.position || ""}
              onChange={(e) =>
                setEmployeeData((prev) => ({
                  ...prev,
                  position: e.target.value,
                }))
              }
              required
              placeholder="Ej: Desarrollador Frontend"
              className="mb-0! font-bold uppercase text-xs tracking-wide"
            />
          </div>
          <Select
            label="ÁREA / DEPARTAMENTO"
            id="employeeArea"
            value={employeeData.area || ""}
            onChange={(e) => setEmployeeData((prev) => ({ ...prev, area: e.target.value }))}
            required
            options={[
              { value: "", label: "-- Seleccione un Área --", disabled: true },
              ...dropdownAreaOptions.map((area) => ({ value: area, label: area })),
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-token-text-secondary uppercase tracking-[0.2em] ml-1">
              CORREO ELECTRÓNICO
            </label>
            <Input
              id="employeeEmail"
              type="email"
              value={employeeData.email || ""}
              onChange={handleEmailChange}
              placeholder="ejemplo@dominio.com"
              error={emailError}
              className="mb-0! font-bold uppercase text-xs tracking-wide"
            />
          </div>
          <Select
            label="TIPO DE JORNADA"
            id="employeeWorkdayType"
            value={employeeData.workdayType || ""}
            onChange={(e) =>
              setEmployeeData((prev) => ({
                ...prev,
                workdayType: e.target.value,
              }))
            }
            required
            options={[
              { value: "", label: "-- Seleccione Tipo Jornada --", disabled: true },
              ...dropdownWorkdayTypeOptions.map((type) => ({ value: type, label: type })),
            ]}
          />
        </div>

        {(!isEditing || (isEditing && !hasLinkedUser)) && (
          <div className="flex items-center p-4 bg-token-surface-stripe rounded-md border border-token-border-technical group/toggle">
            <label className="relative flex items-center cursor-pointer group w-full">
              <Switch
                checked={!!employeeData.createUserAccount}
                onChange={(checked) =>
                  setEmployeeData((prev) => ({
                    ...prev,
                    createUserAccount: checked,
                  }))
                }
              />
              <div className="ml-4 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-token-text-primary transition-colors group-hover:text-sap-blue">
                  {isEditing
                    ? "Generar Cuenta de Acceso Asociada"
                    : "Crear Cuenta Electrónica para este Empleado"}
                </p>
                <p className="text-[9px] text-token-text-tertiary font-medium tracking-wide mt-0.5">
                  Habilita el acceso al portal de autoservicio y marcación digital
                </p>
              </div>
            </label>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-token-border-subtle mt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="px-6 py-2.5 text-[10px] uppercase tracking-widest"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="px-8 py-2.5 text-[10px] uppercase tracking-widest"
          >
            {isEditing ? "Actualizar Perfil" : "Registrar Alta"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeForm;
