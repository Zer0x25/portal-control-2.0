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
      newNoteContent={controller.newNoteContent}
      selectedColor={controller.selectedColor}
      colorOptions={controller.colorOptions}
      onSetSelectedColor={controller.setSelectedColor}
      onSetNewNoteContent={controller.setNewNoteContent}
      onAddNote={controller.handleAddNote}
      onDeleteNote={controller.deleteNote}
      canDelete={controller.canDelete}
    />
  );
};

export default QuickNotesModalContainer;
