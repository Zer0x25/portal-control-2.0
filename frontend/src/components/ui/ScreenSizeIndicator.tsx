import React, { useState, useEffect } from "react";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useAuth } from "../../hooks/useAuth";
import { DevicePhoneMobileIcon } from "./icons/index";
import { STORAGE_KEYS } from "../../constants";

const ScreenSizeIndicator: React.FC = () => {
  const { width, height } = useScreenSize();
  const { currentUser } = useAuth();

  const [devModeEnabled, setDevModeEnabled] = useState(
    () => localStorage.getItem(STORAGE_KEYS.DEV_MODE) === "true",
  );

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEYS.DEV_MODE) {
        setDevModeEnabled(event.newValue === "true");
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Re-check on mount in case the value changed in another tab
    setDevModeEnabled(localStorage.getItem(STORAGE_KEYS.DEV_MODE) === "true");

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Only show this for Admins in Dev Mode
  if (!devModeEnabled || currentUser?.role !== "Administrador") {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-gray-800/80 px-3 py-1.5 text-xs font-mono text-white shadow-lg backdrop-blur-sm"
      title={`Ancho: ${width}px, Alto: ${height}px`}
    >
      <DevicePhoneMobileIcon className="h-4 w-4" />
      <span>
        {width} x {height}px
      </span>
    </div>
  );
};

export default ScreenSizeIndicator;
