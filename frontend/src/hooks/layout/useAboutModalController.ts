import { useCallback, useRef, useState } from "react";
import { STORAGE_KEYS } from "../../constants";
import { useAuth } from "../useAuth";
import { useToasts } from "../useToasts";

export const useAboutModalController = () => {
  const [clickCount, setClickCount] = useState(0);
  const [showMonkey, setShowMonkey] = useState(false);
  const clickTimeoutRef = useRef<number | null>(null);

  const { addToast } = useToasts();
  const { currentUser } = useAuth();

  const closeMonkey = useCallback(() => {
    setShowMonkey(false);
  }, []);

  const handleLogoClick = useCallback(() => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    const newClickCount = clickCount + 1;
    setClickCount(newClickCount);

    if (newClickCount >= 10) {
      if (currentUser?.role === "Administrador") {
        const isDevModeCurrentlyEnabled = localStorage.getItem(STORAGE_KEYS.DEV_MODE) === "true";
        const newDevModeState = !isDevModeCurrentlyEnabled;

        localStorage.setItem(STORAGE_KEYS.DEV_MODE, String(newDevModeState));
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: STORAGE_KEYS.DEV_MODE,
            newValue: String(newDevModeState),
          }),
        );

        addToast(
          `Modo Desarrollador ${newDevModeState ? "Activado" : "Desactivado"}.`,
          newDevModeState ? "success" : "warning",
        );

        if (!newDevModeState) {
          addToast("La página se recargará para aplicar los cambios.", "info", 4000);
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } else if (currentUser?.role === "Supervisor_Elevado") {
        setShowMonkey(true);
      }

      setClickCount(0);
      return;
    }

    clickTimeoutRef.current = window.setTimeout(() => {
      setClickCount(0);
    }, 500);
  }, [addToast, clickCount, currentUser?.role]);

  return {
    handleLogoClick,
    closeMonkey,
    showMonkey,
  };
};
