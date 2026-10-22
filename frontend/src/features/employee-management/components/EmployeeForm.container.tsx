import React from "react";
import EmployeeFormView from "./EmployeeForm.view";
import {
  useEmployeeFormController,
  type EmployeeFormValues,
} from "../hooks/useEmployeeFormController";
import type { Employee } from "../../../types/index";

/**
 * Spec 036 T9: el container del formulario de empleado.
 *
 * Es el unico punto donde vive el estado del formulario: el container
 * instancia el hook de dominio y se lo pasa a la vista (que es presentacion
 * pura). El patron es el de la spec 033 (`*.container.tsx` + `*.view.tsx`).
 */
export interface EmployeeFormContainerProps {
  /** Empleado en edicion (`null` cuando se da de alta uno nuevo). */
  employee: Employee | null;
  /** Empleados ya registrados (el RUT no puede repetirse). */
  existingEmployees: readonly Employee[];
  /** Listas de configuracion para los desplegables. */
  areaList: readonly string[];
  readonly workdayTypeList: readonly string[];
  /** Id asignado al proximo empleado. */
  nextEmployeeId: string;
  /** El empleado en edicion ya tiene usuario. */
  hasLinkedUser: boolean;
  /** Guarda el empleado. */
  onSave: (values: EmployeeFormValues) => Promise<boolean>;
  /** Cancela el alta o la edicion. */
  onCancel: () => void;
}

const EmployeeFormContainer: React.FC<EmployeeFormContainerProps> = ({
  employee,
  existingEmployees,
  areaList,
  workdayTypeList,
  nextEmployeeId,
  hasLinkedUser,
  onSave,
  onCancel,
}) => {
  const controller = useEmployeeFormController({
    employee,
    existingEmployees,
    areaList,
    workdayTypeList,
    nextEmployeeId,
    hasLinkedUser,
    onSave,
    onCancel,
  });

  return (
    <EmployeeFormView
      values={controller.values}
      getError={controller.getError}
      setValue={controller.setValue}
      handleRutChange={controller.handleRutChange}
      dropdownAreaOptions={controller.dropdownAreaOptions}
      dropdownWorkdayTypeOptions={controller.dropdownWorkdayTypeOptions}
      isEditing={controller.isEditing}
      nextEmployeeId={controller.nextEmployeeId}
      hasLinkedUser={controller.hasLinkedUser}
      isSubmitting={controller.isSubmitting}
      formProps={controller.formProps}
      onCancel={controller.onCancel}
    />
  );
};

export default EmployeeFormContainer;
