import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../useAuth";
import { useDataRefresher } from "../useDataRefresher";
import { useLoginAutomations } from "../useLoginAutomations";
import { STORAGE_KEYS } from "../../constants";
import { getDefaultRouteForRole } from "../../utils/routeUtils";
import { useStore } from "../../store/useStore";

export const usePersistentLayoutController = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [devModeEnabled, setDevModeEnabled] = useState(
    localStorage.getItem(STORAGE_KEYS.DEV_MODE) === "true",
  );

  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isInitialSync = useStore((state) => state.isInitialSync);

  useDataRefresher();
  const { handoverData, isHandoverModalOpen, closeHandoverModal } = useLoginAutomations();

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEYS.DEV_MODE) {
        setDevModeEnabled(event.newValue === "true");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const openSidebarFromSwipe = useCallback((offsetX: number, velocityX: number) => {
    if (offsetX > 80 || velocityX > 500) {
      setIsSidebarOpen(true);
    }
  }, []);

  const homeFabTarget = useMemo(() => {
    if (!currentUser) return null;
    return getDefaultRouteForRole(currentUser.role);
  }, [currentUser]);

  const showHomeFab = useMemo(() => {
    if (!homeFabTarget) return false;
    return location.pathname !== homeFabTarget;
  }, [homeFabTarget, location.pathname]);

  const homeFabTitle = useMemo(() => {
    switch (currentUser?.role) {
      case "Supervisor":
        return "Ir al Dashboard de Supervisión";
      case "Usuario":
        return "Ir a Mi Portal";
      case "Fiscalizador":
        return "Ir al Control de Horario";
      default:
        return "Ir al Dashboard Principal";
    }
  }, [currentUser?.role]);

  const canShowDevPanel = currentUser?.role === "Administrador" && devModeEnabled;

  const goHome = useCallback(() => {
    if (homeFabTarget) {
      navigate(homeFabTarget);
    }
  }, [homeFabTarget, navigate]);

  return {
    canShowDevPanel,
    closeHandoverModal,
    currentPath: location.pathname,
    currentUser,
    goHome,
    handoverData,
    homeFabTitle,
    isHandoverModalOpen,
    isInitialSync,
    isSidebarOpen,
    openSidebarFromSwipe,
    showHomeFab,
    toggleSidebar,
  };
};
