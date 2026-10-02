import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { useToasts } from "../../../hooks/useToasts";
import { useUsers } from "../../../hooks/useUsers";

interface UseChangePasswordModalControllerParams {
  isOpen: boolean;
  onClose: () => void;
  userIdToUpdate?: string;
}

export const useChangePasswordModalController = ({
  isOpen,
  onClose,
  userIdToUpdate,
}: UseChangePasswordModalControllerParams) => {
  const { currentUser } = useAuth();
  const { getUserById, updateUser, changeOwnPassword } = useUsers();
  const { addToast } = useToasts();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const targetUser = useMemo(() => {
    const targetId = userIdToUpdate || currentUser?.id;
    return targetId ? getUserById(targetId) : null;
  }, [userIdToUpdate, currentUser, getUserById]);

  const isSelfChange = !userIdToUpdate;

  useEffect(() => {
    if (isOpen) {
      setNewPassword("");
      setConfirmPassword("");
      setIsLoading(false);
    }
  }, [isOpen]);

  const modalTitle = isSelfChange
    ? "Cambiar Mi Contraseña"
    : `Cambiar Contraseña para ${targetUser?.username}`;

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

    if (!targetUser || !currentUser) {
      addToast("No se pudo identificar al usuario para actualizar.", "error");
      return;
    }

    if (targetUser.id === "admin-001" && targetUser.username === "admin") {
      addToast(
        "La contraseña del administrador por defecto (admin) no puede ser cambiada.",
        "error",
        7000,
      );
      return;
    }

    setIsLoading(true);
    let success = false;

    if (isSelfChange) {
      success = await changeOwnPassword({ newPassword });
    } else {
      success = await updateUser(targetUser.id, { password: newPassword });
    }

    setIsLoading(false);

    if (success) {
      addToast(`Contraseña para '${targetUser.username}' actualizada con éxito.`, "success");
      onClose();
    }
  };

  return {
    confirmPassword,
    isLoading,
    modalTitle,
    newPassword,
    setConfirmPassword,
    setNewPassword,
    handleSave,
  };
};
