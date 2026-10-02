import { useMemo, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { useQuickNotes } from "../../../hooks/useQuickNotes";

export const COLOR_MAP: Record<string, string> = {
  amber: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
  blue: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
  emerald: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800",
  rose: "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800",
  indigo: "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800",
};

export const INDICATOR_COLOR_MAP: Record<string, string> = {
  amber: "bg-amber-400 dark:bg-amber-600",
  blue: "bg-blue-400 dark:bg-blue-600",
  emerald: "bg-emerald-400 dark:bg-emerald-600",
  rose: "bg-rose-400 dark:bg-rose-600",
  indigo: "bg-indigo-400 dark:bg-indigo-600",
};

export const useQuickNotesModalController = () => {
  const { notes, isLoadingNotes, addNote, deleteNote } = useQuickNotes();
  const { currentUser } = useAuth();
  const [newNoteContent, setNewNoteContent] = useState("");
  const [selectedColor, setSelectedColor] = useState("amber");

  const colorOptions = useMemo(() => Object.keys(COLOR_MAP), []);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    const success = await addNote(newNoteContent, selectedColor);
    if (success) {
      setNewNoteContent("");
    }
  };

  const canDelete = (authorUsername: string) => {
    return authorUsername === currentUser?.username || currentUser?.role === "Administrador";
  };

  return {
    canDelete,
    colorOptions,
    currentUser,
    deleteNote,
    handleAddNote,
    isLoadingNotes,
    newNoteContent,
    notes,
    selectedColor,
    setNewNoteContent,
    setSelectedColor,
  };
};
