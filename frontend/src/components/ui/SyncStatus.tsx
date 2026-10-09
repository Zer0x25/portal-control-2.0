import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from "./icons/index";
import { idbGetAllBy, STORES } from "../../utils/indexedDB";
import SyncErrorsModal from "./SyncErrorsModal";
import { Syncable, SyncState } from "../../types/index";
import { useStore } from "../../store/useStore";
import { API_ORIGIN_URL } from "../../services/apiBase";

// A cloud icon with an arrow for syncing
const SyncIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className || "w-6 h-6"}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 16.5V9.75m0 0l-3 3m3-3 3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
    />
  </svg>
);

// A simple cloud icon for idle state
const CloudIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className || "w-6 h-6"}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.5 4.5 0 0 0 2.25 15Z"
    />
  </svg>
);

// Wifi Off Icon for Backend Offline
const WifiOffIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className || "w-6 h-6"}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 3l18 18M4.5 9a15.454 15.454 0 0115 0m-12 3a9.454 9.454 0 019 0m-6 3a3.454 3.454 0 013 0"
    />
  </svg>
);

const SYNCABLE_STORES_FOR_ERRORS = [
  STORES.EMPLOYEES,
  STORES.USERS,
  STORES.DAILY_TIME_RECORDS,
  STORES.THEORETICAL_SHIFT_PATTERNS,
  STORES.ASSIGNED_SHIFTS,
  STORES.SHIFT_REPORTS,
  STORES.APP_SETTINGS,
];

const SyncStatus: React.FC = () => {
  const syncState = useStore((state) => state.syncState);
  const [isErrorsModalOpen, setIsErrorsModalOpen] = useState(false);
  const [erroredItems, setErroredItems] = useState<Syncable[]>([]);

  // Backend Health State
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(true);

  useEffect(() => {
    const healthUrl = `${API_ORIGIN_URL}/api/health`;

    const checkHealth = async () => {
      try {
        // Short timeout for health check
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(healthUrl, {
          method: "GET",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          setIsBackendOnline(true);
        } else {
          setIsBackendOnline(false);
        }
      } catch {
        setIsBackendOnline(false);
      }
    };

    // Initial check
    checkHealth();

    // Poll every 10 seconds
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusInfo = (
    state: SyncState,
    backendOnline: boolean,
  ): {
    Icon: React.FC<{ className?: string }>;
    color: string;
    tooltip: string;
    spin: boolean;
    action?: () => void;
  } => {
    // Priority 1: Backend Offline
    if (!backendOnline) {
      return {
        Icon: WifiOffIcon,
        color: "text-red-500",
        tooltip: "Sin Conexión con Servidor",
        spin: false,
      };
    }

    // Priority 2: Sync States
    switch (state) {
      case "syncing":
        return { Icon: SyncIcon, color: "text-blue-400", tooltip: "Sincronizando...", spin: true };
      case "success":
        return {
          Icon: CheckCircleIcon,
          color: "text-emerald-400",
          tooltip: "Sistema Sincronizado",
          spin: false,
        };
      case "error":
        return {
          Icon: XCircleIcon,
          color: "text-red-400",
          tooltip: "Error de Sincronización. Click para ver detalles.",
          spin: false,
          action: () => {
            fetchErroredItems();
            setIsErrorsModalOpen(true);
          },
        };
      case "no-network":
        return {
          Icon: ExclamationTriangleIcon,
          color: "text-yellow-400",
          tooltip: "Sin internet (Cliente)",
          spin: false,
        };
      case "idle":
      default:
        return {
          Icon: CloudIcon,
          color: "text-token-text-tertiary",
          tooltip: "En Espera",
          spin: false,
        };
    }
  };

  const fetchErroredItems = async () => {
    const allErroredItems: Syncable[] = [];
    for (const storeName of SYNCABLE_STORES_FOR_ERRORS) {
      const items = await idbGetAllBy<Syncable>(storeName, "syncStatus", "error");
      allErroredItems.push(...items);
    }
    setErroredItems(allErroredItems);
  };

  const { Icon, color, tooltip, spin, action } = getStatusInfo(syncState, isBackendOnline);

  return (
    <>
      <motion.div
        className={`p-2 rounded-full cursor-pointer transition-colors hover:bg-white/10 ${action ? "cursor-pointer" : "cursor-default"}`}
        title={tooltip}
        aria-label={tooltip}
        onClick={action}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Icon className={`w-5 h-5 ${color} ${spin ? "animate-spin" : ""}`} />
      </motion.div>
      <SyncErrorsModal
        isOpen={isErrorsModalOpen}
        onClose={() => setIsErrorsModalOpen(false)}
        erroredItems={erroredItems}
      />
    </>
  );
};

export default SyncStatus;
