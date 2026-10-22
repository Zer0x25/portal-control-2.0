import React from "react";
import QuickNotesModalView from "./QuickNotesModal.view";
import { useQuickNotesModalController } from "../hooks/useQuickNotesModalController";

interface QuickNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QuickNotesModalContainer: React.FC<QuickNotesModalProps> = ({ isOpen, onClose }) => {
  const controller = useQuickNotesModalController();

  return (
    <QuickNotesModalView
      isOpen={isOpen}
      onClose={onClose}
      notes={controller.notes}
      isLoadingNotes={controller.isLoadingNotes}
      noteContent={controller.values.content}
      contentError={controller.getError("content")}
      selectedColor={controller.values.color ?? "amber"}
      colorOptions={controller.colorOptions}
      onColorChange={controller.handleColorChange}
      onContentChange={controller.handleContentChange}
      onDeleteNote={controller.deleteNote}
      canDelete={controller.canDelete}
      isSubmitting={controller.isSubmitting}
      formProps={controller.formProps}
    />
  );
};

export default QuickNotesModalContainer;
