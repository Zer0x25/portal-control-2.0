import React from "react";

import AddSupplierModalView from "./AddSupplierModal.view";
import { useSupplierFormController } from "../hooks/useSupplierFormController";
import type { SupplierEntry } from "../../../types/index";

/**
 * Spec 036 T10: el container del formulario de proveedor.
 *
 * Es el unico punto donde vive el estado del formulario: el container
 * instancia el hook de dominio y se lo pasa a la vista (que es presentacion
 * pura). El patron es el de la spec 033 (`*.container.tsx` + `*.view.tsx`).
 */
export interface AddSupplierModalContainerProps {
  /** El modal esta abierto. */
  isOpen: boolean;
  /** Cierra el modal. */
  onClose: () => void;
  /** Guarda el registro. */
  onSave: (data: Omit<SupplierEntry, "id" | "timestamp">) => Promise<void> | void;
  /** Registro en edicion (`null` cuando es uno nuevo). */
  initialData?: SupplierEntry | null;
  /** Se esta editando un registro. */
  isEditing: boolean;
}

const AddSupplierModalContainer: React.FC<AddSupplierModalContainerProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  isEditing,
}) => {
  const controller = useSupplierFormController({
    isOpen,
    initialData,
    onSave,
  });

  return (
    <AddSupplierModalView
      isOpen={isOpen}
      onClose={onClose}
      isEditing={isEditing}
      values={controller.values}
      getError={controller.getError}
      handleLicensePlateChange={controller.handleLicensePlateChange}
      handleDriverNameChange={controller.handleDriverNameChange}
      handleCompanyChange={controller.handleCompanyChange}
      handleReasonChange={controller.handleReasonChange}
      handlePaxCountChange={controller.handlePaxCountChange}
      handleTimeChange={controller.handleTimeChange}
      isTimePickerOpen={controller.isTimePickerOpen}
      openTimePicker={controller.openTimePicker}
      closeTimePicker={controller.closeTimePicker}
      isSubmitting={controller.isSubmitting}
      submit={controller.submit}
      formProps={controller.formProps}
    />
  );
};

export default AddSupplierModalContainer;
