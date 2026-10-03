import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { ROUTES } from "../../constants";
import { useNotifications } from "../useNotifications";

export const useNotificationCenterController = () => {
  const { notifications, unreadCount, markCommunicationsAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleNotificationClick = useCallback(
    (id: string, link: string, type: "request" | "communication" | "alert") => {
      setIsOpen(false);

      if (type === "communication") {
        markCommunicationsAsRead();
      }

      if (id === "pending-corrections-notif" || link === ROUTES.SUPERVISOR_DASHBOARD) {
        navigate(ROUTES.SUPERVISOR_DASHBOARD, { state: { openRequestsTab: true } });
      } else if (id.startsWith("alert-")) {
        navigate(ROUTES.SUPERVISOR_DASHBOARD, { state: { openAccountingTab: true } });
      } else {
        navigate(link);
      }
    },
    [markCommunicationsAsRead, navigate],
  );

  return {
    dropdownRef,
    handleNotificationClick,
    isOpen,
    notifications,
    toggleOpen,
    unreadCount,
  };
};
