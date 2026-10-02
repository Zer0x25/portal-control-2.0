import { useState, useEffect } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { useToasts } from "../../../hooks/useToasts";
import { getSettingValue, setSettingValue, COUNTER_IDS } from "../../../utils/indexedDB";

export const useCommunicationsData = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToasts();

  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const isAdmin = currentUser?.role === "Administrador";

  useEffect(() => {
    const loadContent = async () => {
      setIsLoading(true);
      try {
        const storedContent = await getSettingValue<string>(
          COUNTER_IDS.COMMUNICATIONS_CONTENT_ID,
          "",
        );
        setContent(storedContent);
      } catch (error) {
        console.error("Error loading communications content:", error);
        addToast("Error al cargar los comunicados.", "error");
      } finally {
        setIsLoading(false);
      }
    };
    loadContent();
  }, [addToast]);

  const handleSave = async () => {
    try {
      await setSettingValue(COUNTER_IDS.COMMUNICATIONS_CONTENT_ID, content);
      addToast("Comunicado guardado con éxito.", "success");
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving communications content:", error);
      addToast("Error al guardar el comunicado.", "error");
    }
  };

  return {
    content,
    isLoading,
    isEditing,
    isAdmin,
    setContent,
    setIsEditing,
    handleSave,
  };
};
