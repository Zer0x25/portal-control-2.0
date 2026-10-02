import React from "react";
import ChangePasswordModalView from "./ChangePasswordModal.view";
import { useChangePasswordModalController } from "../hooks/useChangePasswordModalController";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userIdToUpdate?: string;
}

const ChangePasswordModalContainer: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  userIdToUpdate,
}) => {
  const controller = useChangePasswordModalController({
    isOpen,
    onClose,
    userIdToUpdate,
  });

  return (
    <ChangePasswordModalView
      isOpen={isOpen}
      onClose={onClose}
      modalTitle={controller.modalTitle}
      newPassword={controller.newPassword}
      confirmPassword={controller.confirmPassword}
      isLoading={controller.isLoading}
      onSetNewPassword={controller.setNewPassword}
      onSetConfirmPassword={controller.setConfirmPassword}
      onSave={controller.handleSave}
    />
  );
};

export default ChangePasswordModalContainer;
