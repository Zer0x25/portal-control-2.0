import React from "react";
import Button from "./Button";
import { ExclamationTriangleIcon } from "./icons/index";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>; // Allow async functions
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "secondary" | "danger";
  confirmDelay?: number;
}

import CinematicModal from "./CinematicModal";
import IconBox from "./IconBox";
import { useState, useEffect } from "react";

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  confirmVariant = "danger",
  confirmDelay = 0,
}) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (isOpen && confirmDelay > 0) {
      setTimeLeft(confirmDelay);
    } else {
      setTimeLeft(0);
    }
  }, [isOpen, confirmDelay]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const handleConfirm = async () => {
    if (timeLeft > 0) return;
    await onConfirm();
    onClose();
  };

  const getIconVariant = () => {
    if (confirmVariant === "danger") return "danger";
    if (confirmVariant === "primary") return "primary";
    return "neutral";
  };

  return (
    <CinematicModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <IconBox icon={<ExclamationTriangleIcon />} variant={getIconVariant()} size="md" />
          <span className="text-token-text-primary">{title}</span>
        </div>
      }
      maxWidth="max-w-lg"
    >
      <div className="text-center sm:text-left">
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-token-text-tertiary mb-2">
          Acción Requerida
        </p>
        <div className="text-sm font-bold text-token-text-secondary leading-relaxed mb-8">
          {message}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col sm:flex-row-reverse gap-3">
        <Button
          onClick={handleConfirm}
          variant={confirmVariant}
          className="w-full sm:w-auto h-11 transition-all duration-200"
          disabled={timeLeft > 0}
        >
          {timeLeft > 0 ? `${confirmText} (${timeLeft}s)` : confirmText}
        </Button>
        <Button onClick={onClose} variant="secondary" className="w-full sm:w-auto h-11">
          {cancelText}
        </Button>
      </div>
    </CinematicModal>
  );
};

export default ConfirmationModal;
