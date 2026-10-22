import React from "react";

import AddNoveltyModalView from "./AddNoveltyModal.view";
import { useNoveltyFormController } from "../hooks/useNoveltyFormController";

/**
 * Spec 036 T10: el container del formulario de novedad.
 *
 * Es el unico punto donde vive el estado del formulario: el container
 * instancia el hook de dominio y se lo pasa a la vista (que es presentacion
 * pura). El patron es el de la spec 033 (`*.container.tsx` + `*.view.tsx`).
 */
export interface AddNoveltyModalContainerProps {
  /** El modal esta abierto. */
  isOpen: boolean;
  /** Cierra el modal. */
  onClose: () => void;
  /** Guarda la novedad. */
  onSave: (annotation: string, time: string) => Promise<void> | void;
  /** Anotacion inicial (edicion). */
  initialText?: string;
  /** Hora inicial (edicion). */
  initialTime?: string;
  /** Se esta editando una novedad. */
  isEditing: boolean;
}

const AddNoveltyModalContainer: React.FC<AddNoveltyModalContainerProps> = ({
  isOpen,
  onClose,
  onSave,
  initialText,
  initialTime,
  isEditing,
}) => {
  const controller = useNoveltyFormController({
    isOpen,
    initialText,
    initialTime,
    onSave,
  });

  return (
    <AddNoveltyModalView
      isOpen={isOpen}
      onClose={onClose}
      isEditing={isEditing}
      values={controller.values}
      getError={controller.getError}
      handleAnnotationChange={controller.handleAnnotationChange}
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

export default AddNoveltyModalContainer;
