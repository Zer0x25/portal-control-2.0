import React from "react";
import ToastItem from "../ui/ToastItem";
import type { ToastMessage } from "../../types/ui";

interface ToastContainerViewProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const ToastContainerView: React.FC<ToastContainerViewProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-6 right-6 pointer-events-none flex flex-col items-end justify-end space-y-4 z-100000 w-full max-w-sm"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

export default ToastContainerView;
