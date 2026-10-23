import { useEffect, useState } from "react";
import DOMPurify from "../utils/domPurify";

const MANUAL_LOAD_ERROR = "Error al cargar el manual.";

const parseMarkdown = (text: string): string =>
  text
    .split("\n")
    .map((line) => {
      if (line.startsWith("### ")) return `<h3>${line.substring(4)}</h3>`;
      if (line.startsWith("## ")) return `<h2>${line.substring(3)}</h2>`;
      if (line.startsWith("# ")) return `<h1>${line.substring(2)}</h1>`;

      line = line.replace(
        /!\[(.*?)\]\((.*?)\)/g,
        '<img alt="$1" src="imagens/Mini_Zer0x.jpg" loading="lazy" decoding="async" class="mx-auto my-4 rounded shadow-md dark:shadow-lg dark:shadow-black/50" style="max-width: 80%;" />',
      );
      line = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      line = line.replace(/\*(.*?)\*/g, "<em>$1</em>");

      if (line.startsWith("- ")) return `<li>${line.substring(2)}</li>`;

      line = line.replace(
        /`(.*?)`/g,
        '<code class="bg-token-surface-technical text-token-text-primary px-1 py-0.5 rounded text-sm">$1</code>',
      );

      if (line.trim() !== "" && !line.startsWith("<")) return `<p>${line}</p>`;
      return line;
    })
    .join("")
    .replace(/<p><\/p>/g, "")
    .replace(/<\/li><li>/g, "</li><li>")
    .replace(/(<li>.*<\/li>)/g, "<ul>$1</ul>")
    .replace(/<\/ul><ul>/g, "");

/** Carga y sanitiza el asset estático del manual cuando se abre el modal. */
export const useUserManual = (isOpen: boolean) => {
  const [manualContent, setManualContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsLoading(true);

    void fetch("/ManualRelojControl.md")
      .then((response) => {
        if (!response.ok) throw new Error("Network response was not ok");
        return response.text();
      })
      .then((text) => {
        if (cancelled) return;
        const parsed = parseMarkdown(text);
        setManualContent(DOMPurify.sanitize(parsed, { USE_PROFILES: { html: true } }));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error("Error fetching user manual:", error);
        setManualContent(MANUAL_LOAD_ERROR);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  return { manualContent, isLoading, hasLoadError: manualContent === MANUAL_LOAD_ERROR };
};
