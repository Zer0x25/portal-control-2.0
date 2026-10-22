import React from "react";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Switch from "../../../components/ui/Switch";
import type { EmployeeFormValues } from "../hooks/useEmployeeFormController";

/**
 * Spec 036 T9: `EmployeeForm` es **presentacion pura**.
 *
 * Antes el componente tenia su propio estado (`rutError`, `emailError`) y
 * escribia en el borrador del padre: la capa de componentes gestionaba
 * estado, justo lo que la spec 033 prohibe. Ahora los valores, los errores y
 * los handlers entran por props (los lleva el hook de dominio).
 */
export interface EmployeeFormViewProps {
  /** Valores actuales del formulario. */
  values: EmployeeFormValues;
  /** Mensaje de error de un campo (o `undefined`). */
  getError: (field: string) => string | undefined;
  /** Escribe el valor de un campo. */
  setValue: <K extends keyof EmployeeFormValues & string>(
    name: K,
    value: EmployeeFormValues[K],
  ) => void;
  /** Escribe el RUT con el formato de la pantalla. */
  handleRutChange: (value: string) => void;
  /** Opciones del desplegable de area. */
  dropdownAreaOptions: readonly string[];
  /** Opciones del desplegable de tipo de jornada. */
  dropdownWorkdayTypeOptions: readonly string[];
  /** Se esta editando un empleado (no se muestra el id asignado). */
  isEditing: boolean;
  /** Id que se asignara al proximo empleado. */
  nextEmployeeId: string;
  /** El empleado en edicion ya tiene usuario. */
  hasLinkedUser: boolean;
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

const EmployeeFormView: React.FC<EmployeeFormViewProps> = ({
  values,
  getError,
  setValue,
  handleRutChange,
  dropdownAreaOptions,
  dropdownWorkdayTypeOptions,
  isEditing,
  nextEmployeeId,
  hasLinkedUser,
  isSubmitting,
  formProps,
  onCancel,
}) => {
  const nameError = getError("name");
  const rutError = getError("rut");
  const positionError = getError("position");
  const areaError = getError("area");
  const workdayTypeError = getError("workdayType");
  const emailError = getError("email");

  return (
    <div className="space-y-6">
      <form {...formProps} className="space-y-6">
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
            <label
              htmlFor="employeeName"
              className="block text-[10px] font-black text-token-text-secondary uppercase tracking-[0.2em] ml-1"
            >
              NOMBRE COMPLETO
            </label>
            <Input
              id="employeeName"
              type="text"
              value={values.name}
              onChange={(e) => setValue("name", e.target.value)}
              error={nameError}
              required
              placeholder="Ej: Juan Pérez"
              className="mb-0! font-bold uppercase text-xs tracking-wide"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="employeeRut"
              className="block text-[10px] font-black text-token-text-secondary uppercase tracking-[0.2em] ml-1"
            >
              RUT
            </label>
            <Input
              id="employeeRut"
              type="text"
              value={values.rut}
              onChange={(e) => handleRutChange(e.target.value)}
              error={rutError}
              required
              placeholder="Ej: 12345678-9"
              maxLength={10}
              className="mb-0! font-mono font-bold uppercase text-xs tracking-wide"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label
              htmlFor="employeePosition"
              className="block text-[10px] font-black text-token-text-secondary uppercase tracking-[0.2em] ml-1"
            >
              CARGO OPERATIVO
            </label>
            <Input
              id="employeePosition"
              type="text"
              value={values.position}
              onChange={(e) => setValue("position", e.target.value)}
              error={positionError}
              required
              placeholder="Ej: Desarrollador Frontend"
              className="mb-0! font-bold uppercase text-xs tracking-wide"
            />
          </div>
          <Select
            label="ÁREA / DEPARTAMENTO"
            id="employeeArea"
            value={values.area}
            onChange={(e) => setValue("area", e.target.value)}
            error={areaError}
            required
            options={[
              { value: "", label: "-- Seleccione un Área --", disabled: true },
              ...dropdownAreaOptions.map((area) => ({ value: area, label: area })),
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label
              htmlFor="employeeEmail"
              className="block text-[10px] font-black text-token-text-secondary uppercase tracking-[0.2em] ml-1"
            >
              CORREO ELECTRÓNICO
            </label>
            <Input
              id="employeeEmail"
              type="email"
              value={values.email}
              onChange={(e) => setValue("email", e.target.value)}
              error={emailError}
              placeholder="ejemplo@dominio.com"
              className="mb-0! font-bold uppercase text-xs tracking-wide"
            />
          </div>
          <Select
            label="TIPO DE JORNADA"
            id="employeeWorkdayType"
            value={values.workdayType}
            onChange={(e) => setValue("workdayType", e.target.value)}
            error={workdayTypeError}
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
                checked={values.createUserAccount}
                onChange={(checked) => setValue("createUserAccount", checked)}
              />
              <div className="ml-4 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-token-text-primary transition-colors group-hover:text-sap-blue">
                  {isEditing
                    ? "Generar Cuenta de Acceso Asociada"
                    : "Crear Cuenta Electrónica para este Empleado"}
                </p>
                <p className="text-xxs text-token-text-tertiary font-medium tracking-wide mt-0.5">
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
            disabled={isSubmitting}
            className="px-8 py-2.5 text-[10px] uppercase tracking-widest"
          >
            {isEditing ? "Actualizar Perfil" : "Registrar Alta"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeFormView;
