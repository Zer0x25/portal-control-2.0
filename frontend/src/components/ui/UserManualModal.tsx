import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
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
          '<img alt="$1" src="imagens/Mini_Zer0x.jpg" class="mx-auto my-4 rounded shadow-md dark:shadow-lg dark:shadow-black/50" style="max-width: 80%;" />',
        );

        // Bold and Italic
        line = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        line = line.replace(/\*(.*?)\*/g, "<em>$1</em>");

        // List items
        if (line.startsWith("- ")) return `<li>${line.substring(2)}</li>`;

        // Inline code
        line = line.replace(
          /`(.*?)`/g,
          '<code class="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm">$1</code>',
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

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-150 flex items-center justify-center p-4 md:p-8">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            className="relative w-full max-w-4xl max-h-[90vh] h-full bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-black/10 dark:border-white/5 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Cinematic */}
            <div className="p-8 pb-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                  <BookOpenIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight italic">
                    Manual de Usuario
                  </h2>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-0.5">
                    Guía de Operación y Procedimientos
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-500 rounded-xl transition-all"
              >
                <CloseIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="grow overflow-y-auto p-8 scrollbar-premium">
              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
                  <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">
                    Consultando base de conocimientos...
                  </p>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  {manualContent === "Error al cargar el manual." ? (
                    <p className="text-red-500">{manualContent}</p>
                  ) : (
                    <div
                      className="prose dark:prose-invert max-w-none manual-content-premium"
                      dangerouslySetInnerHTML={{ __html: manualContent }}
                    />
                  )}
                </motion.div>
              )}
            </div>

            <div className="p-6 bg-gray-50/50 dark:bg-black/20 border-t border-gray-100 dark:border-white/5 flex justify-end shrink-0">
              <Button
                onClick={onClose}
                className="px-8 rounded-lg bg-gray-900 dark:bg-white dark:text-gray-900 text-white font-black uppercase text-xs tracking-widest shadow-md h-10"
              >
                Cerrar Manual
              </Button>
            </div>

            {/* Decorative background blur */}
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default UserManualModal;
