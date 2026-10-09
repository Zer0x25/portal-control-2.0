import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import DOMPurify from "dompurify";
import Button from "./Button";
import { CloseIcon, BookOpenIcon } from "./icons/index";

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const parseMarkdown = (text: string): string => {
  return (
    text
      .split("\n")
      .map((line) => {
        // Headings
        if (line.startsWith("### ")) return `<h3>${line.substring(4)}</h3>`;
        if (line.startsWith("## ")) return `<h2>${line.substring(3)}</h2>`;
        if (line.startsWith("# ")) return `<h1>${line.substring(2)}</h1>`;

        // Images - Updated to use a valid image from the project
        line = line.replace(
          /!\[(.*?)\]\((.*?)\)/g,
          '<img alt="$1" src="imagens/Mini_Zer0x.jpg" loading="lazy" decoding="async" class="mx-auto my-4 rounded shadow-md dark:shadow-lg dark:shadow-black/50" style="max-width: 80%;" />',
        );

        // Bold and Italic
        line = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        line = line.replace(/\*(.*?)\*/g, "<em>$1</em>");

        // List items
        if (line.startsWith("- ")) return `<li>${line.substring(2)}</li>`;

        // Inline code
        line = line.replace(
          /`(.*?)`/g,
          '<code class="bg-token-surface-technical text-token-text-primary px-1 py-0.5 rounded text-sm">$1</code>',
        );

        // Paragraphs
        if (line.trim() !== "" && !line.startsWith("<")) return `<p>${line}</p>`;

        return line;
      })
      .join("")
      // Basic list handling
      .replace(/<p><\/p>/g, "")
      .replace(/<\/li><li>/g, "</li><li>")
      .replace(/(<li>.*<\/li>)/g, "<ul>$1</ul>")
      .replace(/<\/ul><ul>/g, "")
  );
};

const UserManualModal: React.FC<UserManualModalProps> = ({ isOpen, onClose }) => {
  const [manualContent, setManualContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetch("/ManualRelojControl.md")
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.text();
        })
        .then((text) => {
          const parsed = parseMarkdown(text);
          const sanitized = DOMPurify.sanitize(parsed, { USE_PROFILES: { html: true } });
          setManualContent(sanitized);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching user manual:", error);
          setManualContent("Error al cargar el manual.");
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return createPortal(
    isOpen && (
      <div className="fixed inset-0 z-150 flex items-center justify-center p-4 md:p-8">
        {/* Backdrop */}
        <div
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in"
        />

        {/* Modal Content */}
        <div
          className="relative w-full max-w-4xl max-h-[90vh] h-full bg-token-surface-card rounded-lg shadow-2xl border border-token-border-subtle overflow-hidden flex flex-col animate-in fade-in zoom-in-95 slide-in-from-bottom-2"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Cinematic */}
          <div className="p-8 pb-6 border-b border-token-border-subtle flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                <BookOpenIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-token-text-primary uppercase tracking-tight italic">
                  Manual de Usuario
                </h2>
                <p className="text-[10px] font-black text-token-text-tertiary uppercase tracking-[0.3em] mt-0.5">
                  Guía de Operación y Procedimientos
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="none"
              onClick={onClose}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 text-token-text-tertiary hover:text-red-500 rounded-xl transition-all shadow-none"
            >
              <CloseIcon className="w-6 h-6" />
            </Button>
          </div>

          <div className="grow overflow-y-auto p-8 scrollbar-premium">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-[10px] font-black text-token-text-tertiary uppercase tracking-widest animate-pulse">
                  Consultando base de conocimientos...
                </p>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-top-2">
                {manualContent === "Error al cargar el manual." ? (
                  <p className="text-red-500">{manualContent}</p>
                ) : (
                  <div
                    className="prose dark:prose-invert max-w-none manual-content-premium"
                    dangerouslySetInnerHTML={{ __html: manualContent }}
                  />
                )}
              </div>
            )}
          </div>

          <div className="p-6 bg-token-surface-stripe border-t border-token-border-subtle flex justify-end shrink-0">
            <Button
              variant="primary"
              onClick={onClose}
              className="px-8 rounded-lg font-black uppercase text-xs tracking-widest shadow-md h-10"
            >
              Cerrar Manual
            </Button>
          </div>

          {/* Decorative background blur */}
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        </div>
      </div>
    ),
    document.body,
  );
};

export default UserManualModal;
