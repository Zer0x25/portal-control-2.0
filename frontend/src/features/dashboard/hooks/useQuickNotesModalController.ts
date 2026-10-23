import { useAppForm } from "../../../hooks/useAppForm";
import { useAuth } from "../../../hooks/useAuth";
import { useQuickNotes } from "../../../hooks/useQuickNotes";
import { quickNoteFormSchema, type QuickNoteFormValues } from "../../../schemas/forms/note";

const DEFAULT_NOTE_COLOR = "amber";

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

/**
 * Spec 036 T11 (AC1, AC2, AC3): formulario de **nota rapida**
 * (`QuickNotesModal.tsx`).
 *
 * Antes el modal guardaba el texto y el color en dos `useState` y, si el texto
 * estaba vacio, `handleAddNote` volvia atras **sin decir nada** (el usuario
 * pulsaba "Guardar Nota" y no pasaba nada). Ahora:
 *
 * - el texto y el color viven en `useAppForm` (spec 036 AC1);
 * - la regla vive en el schema (`quickNoteFormSchema`: el contenido es
 *   obligatorio) (spec 036 AC2);
 * - el error sale junto al campo (spec 036 AC3).
 *
 * El modal solo escribe `content` y `color`: `authorUsername` lo deduce el
 * servidor a partir de la sesion (divergencia declarada en `quickNoteForm`).
 *
 * El payload no cambia (T13): `addNote` sigue recibiendo los dos valores, con
 * el contenido recortado por la normalizacion de la capa.
 */

/**
 * Controlador del formulario de nota rapida (spec 036 T11).
 */
export const useQuickNotesModalController = () => {
  const { notes, isLoadingNotes, addNote, deleteNote } = useQuickNotes();
  const { currentUser } = useAuth();

  const colorOptions = Object.keys(COLOR_MAP);

  const form = useAppForm<QuickNoteFormValues>({
    schema: quickNoteFormSchema,
    defaultValues: { content: "", color: DEFAULT_NOTE_COLOR },
    onSubmit: async (values) => {
      const success = await addNote(values.content, values.color ?? DEFAULT_NOTE_COLOR);
      if (success) {
        // La nota quedo guardada: el tablero queda listo para la siguiente.
        // El color elegido se conserva (es el que venia usando el usuario).
        reset({ content: "", color: values.color ?? DEFAULT_NOTE_COLOR });
      }
    },
  });

  const { reset, setValue } = form;

  /** Escribe el texto de la nota. */
  const handleContentChange = (value: string) => {
    setValue("content", value);
  };

  /** Escribe el color de la nota. */
  const handleColorChange = (value: string) => {
    setValue("color", value);
  };

  const canDelete = (authorUsername: string) => {
    return authorUsername === currentUser?.username || currentUser?.role === "Administrador";
  };

  return {
    canDelete,
    colorOptions,
    currentUser,
    deleteNote,
    values: form.values,
    getError: form.getError,
    handleContentChange,
    handleColorChange,
    isSubmitting: form.isSubmitting,
    formProps: form.formProps,
    submit: form.submit,
    isLoadingNotes,
    notes,
  };
};
