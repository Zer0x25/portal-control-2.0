import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../useAuth";
import { useAudio } from "../useAudio";
import { useTheme } from "../useTheme";
import { useControlInternoEnabledQuery } from "../queries/useConfigQuery";
import { buildSidebarMenuByRole } from "./sidebarMenu";

const HOVER_DELAY_MS = 200;
const COLLAPSE_DELAY_MS = 300;
const MOBILE_WIDTH = 1024;

interface UseSidebarControllerParams {
  isOpen: boolean;
  toggleSidebar: () => void;
}

export const useSidebarController = ({ isOpen, toggleSidebar }: UseSidebarControllerParams) => {
  const { play } = useAudio();
  const { effectiveTheme, toggleTheme } = useTheme();
  const { currentUser } = useAuth();
  const { data: isControlInternoEnabled = true } = useControlInternoEnabledQuery();

  const [showAboutModal, setShowAboutModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (window.innerWidth < MOBILE_WIDTH) {
      setIsExpanded(isOpen);
      return;
    }
    setIsExpanded(isHovered);
  }, [isHovered, isOpen]);

  useEffect(() => {
    if (window.innerWidth < MOBILE_WIDTH && isOpen) {
      const timer = setTimeout(() => {
        toggleSidebar();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, toggleSidebar]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
    };
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (window.innerWidth < MOBILE_WIDTH) return;
    if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
    if (isHovered) return;
    hoverTimeoutRef.current = setTimeout(() => setIsHovered(true), HOVER_DELAY_MS);
  }, [isHovered]);

  const handleMouseLeave = useCallback(() => {
    if (window.innerWidth < MOBILE_WIDTH) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    collapseTimeoutRef.current = setTimeout(() => setIsHovered(false), COLLAPSE_DELAY_MS);
  }, []);

  const handleItemClick = useCallback(() => {
    play("click");
    if (window.innerWidth < MOBILE_WIDTH && isOpen) {
      toggleSidebar();
    }
  }, [isOpen, play, toggleSidebar]);

  const handleToggleTheme = useCallback(() => {
    play("click");
    toggleTheme();
  }, [play, toggleTheme]);

  const openAboutModal = useCallback(() => {
    play("click");
    setShowAboutModal(true);
  }, [play]);

  const closeAboutModal = useCallback(() => {
    setShowAboutModal(false);
  }, []);

  const menuItems = useMemo(
    () =>
      buildSidebarMenuByRole({
        role: currentUser?.role,
        isControlInternoEnabled,
      }),
    [currentUser?.role, isControlInternoEnabled],
  );

  return {
    effectiveTheme,
    isExpanded,
    isOpen,
    menuItems,
    showAboutModal,
    handleItemClick,
    handleMouseEnter,
    handleMouseLeave,
    handleToggleTheme,
    openAboutModal,
    closeAboutModal,
    toggleSidebar,
  };
};
