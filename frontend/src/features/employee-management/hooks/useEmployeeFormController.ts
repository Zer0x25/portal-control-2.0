import { useEffect } from "react";
import { Employee } from "../../../types/index";
import { useAppForm } from "../../../hooks/useAppForm";
import {
  buildEmployeeFormSchema,
  type EmployeeFormFieldsValues,
} from "../../../schemas/forms/employee";

/**
 * Spec 036 T9 (AC1, AC2, AC3): formulario de **alta y edicion de empleado**.
 *
 * Antes este formulario era un componente con cuatro `useState` (`rutError`,
 * `emailError` y el borrador de datos que le pasaba el padre) y tres
 * validaciones escritas a mano con `addToast`. Ahora:
 *
 * - el estado de los campos vive en `useAppForm` (spec 036 AC1);
 * - las reglas viven en el schema (`buildEmployeeFormSchema`): los campos
 *   obligatorios, el formato del email, el digito verificador del RUT y el
 *   RUT duplicado (spec 036 AC2);
 * - los errores salen junto al campo, con su mensaje en el mapa central
 *   (spec 036 AC3).
 *
 * El **borrador** (los datos del empleado en edicion) no es estado del
 * formulario: lo deriva el hook del empleado que se esta editando.
 */

/** Valores del formulario de empleado. */
export type EmployeeFormValues = EmployeeFormFieldsValues;

/** Opciones del hook del formulario de empleado. */
export interface UseEmployeeFormControllerOptions {
  /** Empleado en edicion (`null` cuando se da de alta uno nuevo). */
  readonly employee: Employee | null;
  /** Empleados ya registrados (el RUT no puede repetirse). */
  readonly existingEmployees: readonly Employee[];
  /** Listas de configuracion para los desplegables. */
  readonly areaList: readonly string[];
  readonly workdayTypeList: readonly string[];
  /** Id asignado al proximo empleado (se muestra en el formulario). */
  readonly nextEmployeeId: string;
  /** El empleado en edicion ya tiene usuario: no se ofrece crear otro. */
  readonly hasLinkedUser: boolean;
  /** Guarda el empleado (recibe los valores ya validados). */
  readonly onSave: (values: EmployeeFormValues) => Promise<boolean>;
  /** Cancela el alta o la edicion. */
  readonly onCancel: () => void;
}

/**
 * Formatea el RUT mientras el usuario escribe.
 *
 * Regla de la pantalla (no del backend): solo digitos y `K`, hasta 8 digitos
 * y un unico guion con el digito verificador.
 */
export const formatRutInput = (input: string): string => {
  const value = input.toUpperCase().replace(/[^0-9Kk-]/g, "");
  const parts = value.split("-");
  const body = parts[0].replace(/[^0-9]/g, "").slice(0, 8);
  const dv = parts.length > 1 ? parts[1].replace(/[^0-9Kk]/g, "").slice(0, 1) : "";

  if (body) {
    return dv || value.includes("-") ? `${body}-${dv}` : body;
  }
  if (value.includes("-")) {
    return `-${dv}`;
  }
  return dv;
};

/** Valores iniciales del formulario a partir del empleado en edicion. */
const toFormValues = (employee: Employee | null): EmployeeFormValues => ({
  name: employee?.name ?? "",
  rut: employee?.rut ?? "",
  position: employee?.position ?? "",
  area: employee?.area ?? "",
  workdayType: employee?.workdayType ?? "",
  email: employee?.email ?? "",
  createUserAccount: employee ? false : true,
});

/** Controlador del formulario de empleado (spec 036 T9). */
export const useEmployeeFormController = ({
  employee,
  existingEmployees,
  areaList,
  workdayTypeList,
  nextEmployeeId,
  hasLinkedUser,
  onSave,
  onCancel,
}: UseEmployeeFormControllerOptions) => {
  /**
   * Schema con la regla que depende del contexto (el RUT no puede repetir).
   */
  const schema = buildEmployeeFormSchema({
    existingEmployees: existingEmployees.map((item) => ({ id: item.id, rut: item.rut })),
    employeeIdToEdit: employee?.id,
  });

  const form = useAppForm<EmployeeFormValues>({
    schema,
    defaultValues: toFormValues(employee),
    onSubmit: async (values) => {
      await onSave(values);
    },
  });

  const { setValue, reset } = form;

  /**
   * El formulario se reinicia con los datos del empleado en edicion (o con
   * los vacios cuando se da de alta uno nuevo).
   */
  useEffect(() => {
    reset(toFormValues(employee));
  }, [employee, reset]);

  /** Escribe el RUT con el formato de la pantalla. */
  const handleRutChange = (value: string) => {
    setValue("rut", formatRutInput(value));
  };

  const dropdownAreaOptions = (() => {
    const currentArea = form.values.area || "";
    const combinedList = [...new Set([currentArea, ...areaList])].filter(Boolean);
    return combinedList.sort((a, b) => a.localeCompare(b));
  })();

  const dropdownWorkdayTypeOptions = (() => {
    const currentType = form.values.workdayType || "";
    const combinedList = [...new Set([currentType, ...workdayTypeList])].filter(Boolean);
    return combinedList.sort((a, b) => a.localeCompare(b));
  })();

  return {
    values: form.values,
    errors: form.errors,
    getError: form.getError,
    setValue,
    handleRutChange,
    dropdownAreaOptions,
    dropdownWorkdayTypeOptions,
    isEditing: employee !== null,
    nextEmployeeId,
    hasLinkedUser,
    isSubmitting: form.isSubmitting,
    submit: form.submit,
    formProps: form.formProps,
    onCancel,
  };
};
