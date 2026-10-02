import { useEffect, useState } from "react";
import { useToasts } from "../../../hooks/useToasts";
import { useUsers } from "../../../hooks/useUsers";

interface UseForceChangePasswordModalControllerParams {
  isOpen: boolean;
  onClose: () => void;
}

export const useForceChangePasswordModalController = ({
  isOpen,
  onClose,
}: UseForceChangePasswordModalControllerParams) => {
  const { changeOwnPassword } = useUsers();
  const { addToast } = useToasts();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewPassword("");
      setConfirmPassword("");
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      addToast("Las nuevas contraseñas no coinciden.", "error");
      return;
    }

    if (newPassword.length < 6) {
      addToast("La nueva contraseña debe tener al menos 6 caracteres.", "warning");
      return;
    }

    setIsLoading(true);
    const success = await changeOwnPassword({ newPassword });
    setIsLoading(false);

    if (success) {
      addToast("Contraseña actualizada con éxito.", "success");
      onClose();
    }
  };

  return {
    confirmPassword,
    handleSave,
    isLoading,
    newPassword,
    setConfirmPassword,
    setNewPassword,
  };
};
