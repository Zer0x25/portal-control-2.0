import React, { useEffect, useMemo } from "react";
import { ToastMessage } from "../../types/index";
import {
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CloseIcon,
} from "./icons/index";

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

import Button from "./Button";
import { motion } from "framer-motion";

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const { id, message, type, duration } = toast;

  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        onDismiss(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onDismiss]);

  const statusConfig = useMemo(() => {
    switch (type) {
      case "success":
        return {
          Icon: CheckCircleIcon,
          color: "text-sap-success",
          borderColor: "border-sap-success/20",
          glowColor: "shadow-sap-success/20",
        };
      case "error":
        return {
          Icon: XCircleIcon,
          color: "text-sap-error",
          borderColor: "border-sap-error/20",
          glowColor: "shadow-sap-error/20",
        };
      case "info":
        return {
          Icon: InformationCircleIcon,
          color: "text-sap-blue",
          borderColor: "border-sap-blue/20",
          glowColor: "shadow-sap-blue/20",
        };
      case "warning":
        return {
          Icon: ExclamationTriangleIcon,
          color: "text-sap-warning",
          borderColor: "border-sap-warning/20",
          glowColor: "shadow-sap-warning/20",
        };
      default:
        return {
          Icon: InformationCircleIcon,
          color: "text-token-text-tertiary",
          borderColor: "border-token-border-subtle",
          glowColor: "shadow-black/10",
        };
    }
  }, [type]);

  const { Icon, color } = statusConfig;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={`
        pointer-events-auto w-full max-w-sm overflow-hidden
        bg-token-surface-card rounded-lg
        border border-token-border-technical
        border-l-4 ${type === "success" ? "border-l-sap-success" : type === "error" ? "border-l-sap-error" : type === "warning" ? "border-l-sap-warning" : "border-l-sap-blue"}
        shadow-lg flex items-stretch
      `}
    >
      <div className="flex-1 px-5 py-4 flex items-center gap-4">
        <div className={`shrink-0`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-token-text-tertiary mb-0.5">
            {type === "success"
              ? "Éxito"
              : type === "error"
                ? "Error"
                : type === "warning"
                  ? "Aviso"
                  : "Información"}
          </p>
          <p className="text-sm font-semibold text-token-text-primary leading-tight">{message}</p>
        </div>
      </div>

      <div className="flex items-center pr-2">
        <Button
          variant="none"
          onClick={() => onDismiss(id)}
          className="p-2 rounded-lg text-token-text-tertiary hover:text-token-text-primary hover:bg-token-surface-hover transition-colors group"
          aria-label="Cerrar notificación"
        >
          <CloseIcon className="w-4 h-4 transition-transform group-active:scale-90" />
        </Button>
      </div>
    </motion.div>
  );
};

export default ToastItem;
