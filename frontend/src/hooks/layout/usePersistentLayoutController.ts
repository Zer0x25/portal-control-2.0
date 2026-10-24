import { useEffect, useRef, useState, type TouchEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../useAuth";
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

  const { handoverData, isAutoStartEligible, isHandoverModalOpen, closeHandoverModal } =
    useLoginAutomations();

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEYS.DEV_MODE) {
        setDevModeEnabled(event.newValue === "true");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const openSidebarFromSwipe = (offsetX: number, velocityX: number) => {
    if (offsetX > 80 || velocityX > 500) {
      setIsSidebarOpen(true);
    }
  };

  // Gesto de swipe para abrir el sidebar. El `useRef` y los handlers de
  // touch son estado/effects de interacción: viven en el controller, no en la
  // vista (spec 033 AC1: sin hooks en *.view.tsx).
  const touchStartXRef = useRef<number | null>(null);

  const handleSwipeTouchStart = (e: TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleSwipeTouchEnd = (e: TouchEvent) => {
    if (touchStartXRef.current !== null) {
      const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
      if (deltaX > 40) {
        openSidebarFromSwipe(deltaX, 1);
      }
      touchStartXRef.current = null;
    }
  };

  const homeFabTarget = (() => {
    if (!currentUser) return null;
    return getDefaultRouteForRole(currentUser.role);
  })();

  const showHomeFab = (() => {
    if (!homeFabTarget) return false;
    return location.pathname !== homeFabTarget;
  })();

  const homeFabTitle = (() => {
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
  })();

  const canShowDevPanel = currentUser?.role === "Administrador" && devModeEnabled;

  const goHome = () => {
    if (homeFabTarget) {
      navigate(homeFabTarget);
    }
  };

  return {
    canShowDevPanel,
    closeHandoverModal,
    currentPath: location.pathname,
    currentUser,
    isAutoStartEligible,
    goHome,
    handleSwipeTouchEnd,
    handleSwipeTouchStart,
    handoverData,
    homeFabTitle,
    isHandoverModalOpen,
    isInitialSync,
    isSidebarOpen,
    showHomeFab,
    toggleSidebar,
  };
};
