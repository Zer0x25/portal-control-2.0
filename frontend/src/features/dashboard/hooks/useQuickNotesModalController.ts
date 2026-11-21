import { useAppForm } from "../../../hooks/useAppForm";
import { useAuth } from "../../../hooks/useAuth";
import { useQuickNotes } from "../../../hooks/useQuickNotes";
import { quickNoteFormSchema, type QuickNoteFormValues } from "../../../schemas/forms/note";

const DEFAULT_NOTE_COLOR = "amber";

export const COLOR_MAP: Record<string, string> = {
  amber: "bg-token-status-warning-surface border-token-status-warning/30",
  blue: "bg-token-status-info-surface border-token-status-info/30",
  emerald: "bg-token-status-success-surface border-token-status-success/30",
  rose: "bg-token-status-error-surface border-token-status-error/30",
  indigo: "bg-token-status-colacion-surface border-token-status-colacion/30",
};

export const INDICATOR_COLOR_MAP: Record<string, string> = {
  amber: "bg-token-status-warning",
  blue: "bg-token-status-info",
  emerald: "bg-token-status-success",
  rose: "bg-token-status-error",
  indigo: "bg-token-status-colacion",
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
  const { notes, isLoadingNotes, addNote, archiveNote, deleteNote } = useQuickNotes();
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
    archiveNote,
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
