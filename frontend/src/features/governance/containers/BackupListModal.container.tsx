import React from "react";
import { useBackupListModalController } from "../hooks/useBackupListModalController";
import { BackupListModalView } from "../views/BackupListModal.view";

interface BackupListModalContainerProps {
  isOpen: boolean;
  onClose: () => void;
}

const BackupListModalContainer: React.FC<BackupListModalContainerProps> = ({ isOpen, onClose }) => {
  const logic = useBackupListModalController({ isOpen, onClose });
  return <BackupListModalView {...logic} isOpen={isOpen} onClose={onClose} />;
};

export default BackupListModalContainer;
