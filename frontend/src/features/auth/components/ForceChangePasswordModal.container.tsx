import React from "react";
import ForceChangePasswordModalView from "./ForceChangePasswordModal.view";
import { useForceChangePasswordModalController } from "../hooks/useForceChangePasswordModalController";

interface ForceChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ForceChangePasswordModalContainer: React.FC<ForceChangePasswordModalProps> = ({
  isOpen,
  onClose,
}) => {
  const controller = useForceChangePasswordModalController({ isOpen, onClose });

  return (
    <ForceChangePasswordModalView
      isOpen={isOpen}
      newPassword={controller.newPassword}
      confirmPassword={controller.confirmPassword}
      isLoading={controller.isLoading}
      onSetNewPassword={controller.setNewPassword}
      onSetConfirmPassword={controller.setConfirmPassword}
      onSave={controller.handleSave}
    />
  );
};

export default ForceChangePasswordModalContainer;
