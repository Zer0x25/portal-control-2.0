import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { useToasts } from "../../../hooks/useToasts";
import { configService } from "../../../services/configService";
import DOMPurify from "../../../utils/domPurify";
import { logger } from "../../../utils/logger";

const COMMUNICATIONS_CONFIG_KEY = "communications_content";

export const useCommunicationsData = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToasts();

  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const isAdmin = currentUser?.role === "Super_Administrador";

  // La sanitización vive en el hook (capa de orquestación): la vista solo
  // presenta el HTML ya saneado (spec 033 AC1: sin hooks en *.view.tsx).
  const safeContent = useMemo(
    () => DOMPurify.sanitize(content ?? "", { USE_PROFILES: { html: true } }),
    [content],
  );

  useEffect(() => {
    const loadContent = async () => {
      setIsLoading(true);
      try {
        const storedContent = await configService.get<string>(COMMUNICATIONS_CONFIG_KEY);
        const resolved = typeof storedContent === "string" ? storedContent : "";
        setContent(resolved);
        setSavedContent(resolved);
      } catch (error) {
        logger.error("Error loading communications content:", error);
        addToast("Error al cargar los comunicados.", "error");
      } finally {
        setIsLoading(false);
      }
    };
    loadContent();
  }, [addToast]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await configService.set(COMMUNICATIONS_CONFIG_KEY, content);
      setSavedContent(content);
      addToast("Comunicado guardado con éxito.", "success");
      setIsEditing(false);
    } catch (error) {
      logger.error("Error saving communications content:", error);
      addToast("Error al guardar el comunicado.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = useCallback(() => {
    setContent(savedContent);
    setIsEditing(false);
  }, [savedContent]);

  return {
    content,
    safeContent,
    isLoading,
    isSaving,
    isEditing,
    isAdmin,
    setContent,
    setIsEditing,
    handleSave,
    handleDiscard,
  };
};
