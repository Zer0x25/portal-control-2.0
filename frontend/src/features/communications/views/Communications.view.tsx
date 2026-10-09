/* UI-PROTECTED: EDIT ONLY WITH HUMAN APPROVAL
   Presentational layer for Communications feature.
*/

import React from "react";
import DOMPurify from "dompurify";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Container from "../../../components/ui/Container";
import PageHeader from "../../../components/ui/PageHeader";
import { MegaphoneIcon, EditIcon, CheckIcon, XMarkIcon } from "../../../components/ui/icons";

export interface CommunicationsViewProps {
  content: string;
  isLoading: boolean;
  isEditing: boolean;
  isAdmin: boolean;
  setContent: React.Dispatch<React.SetStateAction<string>>;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  handleSave: () => Promise<void>;
}

export const CommunicationsView: React.FC<CommunicationsViewProps> = React.memo(
  ({ content, isLoading, isEditing, isAdmin, setContent, setIsEditing, handleSave }) => {
    const safeContent = React.useMemo(
      () => DOMPurify.sanitize(content ?? "", { USE_PROFILES: { html: true } }),
      [content],
    );

    if (isLoading) {
      return (
        <div className="py-20 text-center text-(--sidebar-text-active) font-bold uppercase tracking-widest animate-pulse">
          Sincronizando comunicados...
        </div>
      );
    }

    return (
      <Container
        variant="standard"
        noPadding
        data-ui-protected
        className="space-y-6 animate-in fade-in duration-500"
      >
        <PageHeader
          eyebrow="Institucional"
          eyebrowIcon={<MegaphoneIcon className="w-3.5 h-3.5" />}
          icon={<MegaphoneIcon className="w-4 h-4" />}
          title="Comunicados Internos"
          subtitle="Difusión masiva de directrices y noticias operativas"
          actions={
            isAdmin &&
            !isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                className="h-10 px-4 bg-token-surface-card border-token-border-technical hover:bg-token-surface-active rounded-sm"
              >
                <EditIcon className="w-4 h-4 mr-2 text-(--sidebar-text-active)" />
                <span className="text-[11px] font-bold uppercase tracking-widest">
                  Editar Comunicado
                </span>
              </Button>
            )
          }
        />

        <Card variant="premium" className="p-8 border-token-border-technical min-h-[500px]">
          {isEditing ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-token-border-technical pb-4">
                <div className="w-1.5 h-6 bg-(--sidebar-text-active) rounded-full"></div>
                <h2 className="text-[12px] font-bold uppercase tracking-[0.2em] text-token-text-primary">
                  Editor de Contenido
                </h2>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="block w-full h-[400px] p-6 bg-token-surface-stripe border border-token-border-technical rounded-sm shadow-inner 
                         text-token-text-primary font-bold text-sm tracking-tight leading-relaxed
                         focus:ring-2 focus:ring-(--sidebar-text-active)/20 outline-none
                         resize-none"
                placeholder="Escriba aquí el comunicado institucional..."
              />
              <div className="flex gap-3 pt-4 border-t border-token-border-technical">
                <Button
                  onClick={handleSave}
                  className="h-11 px-8 bg-(--sidebar-text-active) text-white font-bold rounded-sm border-none"
                >
                  <CheckIcon className="w-4 h-4 mr-2" />
                  Publicar Cambios
                </Button>
                <Button
                  onClick={() => setIsEditing(false)}
                  variant="secondary"
                  className="h-11 px-8 bg-token-surface-card border-token-border-technical rounded-sm"
                >
                  <XMarkIcon className="w-4 h-4 mr-2" />
                  Descartar
                </Button>
              </div>
            </div>
          ) : (
            <div className="prose dark:prose-invert max-w-none">
              {content ? (
                <div
                  className="text-token-text-primary text-sm font-semibold leading-relaxed tracking-tight"
                  dangerouslySetInnerHTML={{ __html: safeContent }}
                />
              ) : (
                <div className="py-20 text-center text-token-text-tertiary uppercase text-[11px] font-bold tracking-widest border border-dashed border-token-border-technical rounded-sm">
                  No hay comunicados activos en este momento
                </div>
              )}
            </div>
          )}
        </Card>
      </Container>
    );
  },
);
