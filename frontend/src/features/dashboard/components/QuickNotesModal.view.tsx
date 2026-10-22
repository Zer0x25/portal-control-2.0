import React from "react";
import Button from "../../../components/ui/Button";
import {
  DeleteIcon,
  BookOpenIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
} from "../../../components/ui/icons/index";
import CinematicModal from "../../../components/ui/CinematicModal";
import IconBox from "../../../components/ui/IconBox";
import { IndustrialIndicator } from "../../../components/ui/IndustrialIndicator";
import EmptyState from "../../../components/ui/EmptyState";
import Textarea from "../../../components/ui/Textarea";
import { QuickNote } from "../../../types";
import { COLOR_MAP, INDICATOR_COLOR_MAP } from "../hooks/useQuickNotesModalController";

/**
 * Spec 036 T11: `QuickNotesModal` es **presentacion pura**.
 *
 * El texto y el color de la nota nueva, sus errores y el handler de envio
 * entran por props (los lleva el hook de dominio) y la maqueta es la misma.
 */
interface QuickNotesModalViewProps {
  isOpen: boolean;
  onClose: () => void;
  notes: QuickNote[];
  isLoadingNotes: boolean;
  noteContent: string;
  /** Mensaje de error del campo (o `undefined`). */
  contentError?: string;
  selectedColor: string;
  colorOptions: string[];
  onColorChange: (color: string) => void;
  onContentChange: (value: string) => void;
  onDeleteNote: (id: string) => void;
  canDelete: (authorUsername: string) => boolean;
  /** Hay un envio en vuelo. */
  isSubmitting: boolean;
  /** Props del `<form>` (id, `noValidate` y `onSubmit` de la capa). */
  formProps: {
    id: string;
    noValidate: true;
    onSubmit: (event: { preventDefault: () => void }) => void;
    "data-app-form": string;
  };
}

const QuickNotesModalView: React.FC<QuickNotesModalViewProps> = ({
  isOpen,
  onClose,
  notes,
  isLoadingNotes,
  noteContent,
  contentError,
  selectedColor,
  colorOptions,
  onColorChange,
  onContentChange,
  onDeleteNote,
  canDelete,
  isSubmitting,
  formProps,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <CinematicModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-4">
          <IconBox icon={<BookOpenIcon />} variant="primary" size="md" />
          <div>
            <h3 className="text-sm font-black text-token-text-primary uppercase leading-none">
              Tablero de Notas
            </h3>
            <p className="text-xxs font-black text-token-text-tertiary uppercase tracking-[0.2em] mt-1.5 leading-none">
              Serendipia de Productividad
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-lg"
    >
      <div className="space-y-6">
        <form {...formProps} className="space-y-4">
          <div className="flex gap-2">
            {colorOptions.map((color) => (
              <Button
                key={color}
                type="button"
                variant="none"
                onClick={() => onColorChange(color)}
                className={`w-5 h-5 rounded-full border-2 transition-all cursor-pointer ${
                  selectedColor === color
                    ? "scale-110 border-indigo-500 shadow-sm"
                    : "border-transparent opacity-60 hover:opacity-100"
                } ${INDICATOR_COLOR_MAP[color]}`}
                aria-label={`Seleccionar color ${color}`}
              >
                <span className="sr-only">{color}</span>
              </Button>
            ))}
          </div>

          <Textarea
            id="new-note-content"
            value={noteContent}
            onChange={(e) => onContentChange(e.target.value)}
            error={contentError}
            placeholder="Escribir una nueva nota técnica..."
            className="text-sm"
            autoComplete="off"
            rows={3}
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || isLoadingNotes} className="px-6 h-10">
              Fijar Nota
            </Button>
          </div>
        </form>

        <div className="space-y-3 max-h-[45vh] overflow-y-auto custom-scrollbar pr-2">
          {isLoadingNotes ? (
            <div className="py-10 text-center animate-pulse">
              <p className="text-[10px] font-black text-token-text-tertiary uppercase tracking-widest">
                Sincronizando notas...
              </p>
            </div>
          ) : notes.length > 0 ? (
            notes.map((note) => (
              <div
                key={note.id}
                className={`group p-4 rounded-md border transition-all relative overflow-hidden flex items-start gap-4 shadow-sm ${COLOR_MAP[note.color || "amber"]}`}
              >
                <IndustrialIndicator
                  height="h-full"
                  color={INDICATOR_COLOR_MAP[note.color || "amber"]}
                  className="mt-1"
                />
                <div className="flex justify-between gap-4 w-full">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-token-text-primary leading-relaxed">
                      {note.content}
                    </p>
                    <div className="flex items-center gap-3 mt-3 opacity-60">
                      <span className="text-xxs font-black text-token-text-secondary uppercase tracking-widest">
                        {note.authorUsername}
                      </span>
                      <span className="text-xxs font-bold text-token-text-tertiary uppercase tracking-widest">
                        {new Date(note.createdAt).toLocaleString("es-CL", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {note.reminderEnabled && (
                        <ChatBubbleLeftRightIcon className="w-3 h-3 text-indigo-500" />
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {canDelete(note.authorUsername) && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => onDeleteNote(note.id)}
                        className="p-1.5 text-token-text-tertiary hover:text-token-status-error"
                        title="Eliminar de forma permanente"
                      >
                        <DeleteIcon className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              icon={<ExclamationTriangleIcon />}
              title="Sin Notas Activas"
              description="No hay recordatorios o anuncios fijados en este momento."
              className="py-12 border-dashed"
            />
          )}
        </div>
      </div>
    </CinematicModal>
  );
};

export default QuickNotesModalView;
