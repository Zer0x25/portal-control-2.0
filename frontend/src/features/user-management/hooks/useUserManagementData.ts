import { useState, useEffect, useRef } from "react";
import { User } from "../../../types/index";
import { useUsers } from "../../../hooks/useUsers";
import { useEmployees } from "../../../hooks/useEmployees";
import { useAuth } from "../../../hooks/useAuth";
import { useToasts } from "../../../hooks/useToasts";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useDebounce } from "../../../hooks/useDebounce";
import { useIntersectionObserver } from "../../../hooks/useIntersectionObserver";
import type { UserFormValues } from "../../../schemas/forms/user";
import { DEFAULT_TEMPORARY_PASSWORD } from "../../../constants";

interface UseUserManagementDataParams {
  isEmbedded?: boolean;
}

export const useUserManagementData = ({ isEmbedded }: UseUserManagementDataParams = {}) => {
  const {
    users: allUsers,
    addUser,
    updateUser,
    deleteUser,
    refreshUsers,
    isLoadingUsers,
  } = useUsers();
  const { activeEmployees, resetEmployeePin } = useEmployees();
  const { currentUser } = useAuth();
  const { addToast } = useToasts();

  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToResetPin, setUserToResetPin] = useState<User | null>(null);
  const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const isMobile = useMediaQuery("(max-width: 768px)");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const pageSize = isMobile ? 30 : 60;
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const processedUsers = (() => {
    let filtered = allUsers;
    if (debouncedSearchTerm) {
      const search = debouncedSearchTerm.toLowerCase();
      filtered = allUsers.filter(
        (u) =>
          u.username.toLowerCase().includes(search) ||
          (u.employeeId &&
            activeEmployees
              .find((e) => e.id === u.employeeId)
              ?.name.toLowerCase()
              .includes(search)),
      );
    }
    return filtered;
  })();

  const paginatedUsers = processedUsers.slice(0, visibleCount);

  const hasNextPage = visibleCount < processedUsers.length;

  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const entry = useIntersectionObserver(sentinelRef, { root: scrollRoot, rootMargin: "200px" });

  useEffect(() => {
    if (entry?.isIntersecting && hasNextPage) {
      setVisibleCount((prev) => prev + pageSize);
    }
  }, [entry?.isIntersecting, hasNextPage, pageSize]);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [debouncedSearchTerm, pageSize]);

  const canCreateUsers = Boolean(
    currentUser &&
    (currentUser.role === "Administrador" || currentUser.role === "Supervisor_Elevado"),
  );

  const canManageUser = (user: User) => {
    if (!currentUser) return false;
    if (currentUser.id === user.id) return false;
    if (currentUser.role === "Administrador") {
      return true;
    }
    if (currentUser.role === "Supervisor_Elevado") {
      return user.role !== "Administrador";
    }
    return false;
  };

  const handleOpenNewForm = () => {
    setEditingUser(null);
    setIsFormVisible(true);
  };

  const handleEditUser = (user: User) => {
    if (!canManageUser(user)) {
      addToast("No tiene permisos para editar este usuario.", "error");
      return;
    }
    setEditingUser(user);
    setIsFormVisible(true);
  };

  const handleSaveUser = async (data: UserFormValues) => {
    if (!currentUser) return;
    if (editingUser) {
      const ok = await updateUser(editingUser.id, {
        role: data.role,
        employeeId: data.employeeId || null,
      });
      if (!ok) return;
      addToast(`Usuario ${editingUser.username} actualizado.`, "success");
    } else {
      const created = await addUser({
        username: data.username,
        password: data.password || DEFAULT_TEMPORARY_PASSWORD,
        role: data.role,
        employeeId: data.employeeId || undefined,
      } as unknown as User);
      if (!created) return;
      addToast(`Usuario ${data.username} creado correctamente.`, "success");
    }
    refreshUsers();
    setIsFormVisible(false);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete || !currentUser) return;
    const ok = await deleteUser(userToDelete.id);
    if (!ok) return;
    refreshUsers();
    addToast(`Usuario ${userToDelete.username} eliminado.`, "success");
    setUserToDelete(null);
  };

  const handleConfirmResetPin = async () => {
    if (!userToResetPin?.employeeId) return;
    const ok = await resetEmployeePin(userToResetPin.employeeId);
    if (!ok) return;
    setUserToResetPin(null);
  };

  const handleConfirmResetPassword = async () => {
    if (!userToResetPassword) return;
    const ok = await updateUser(userToResetPassword.id, {
      password: DEFAULT_TEMPORARY_PASSWORD,
      mustChangePassword: true,
    });
    if (!ok) return;
    refreshUsers();
    addToast(`Contraseña reseteada para ${userToResetPassword.username}.`, "success");
    setUserToResetPassword(null);
  };

  return {
    isEmbedded,
    allUsers,
    activeEmployees,
    currentUser,
    isLoadingUsers,
    isFormVisible,
    editingUser,
    userToDelete,
    userToResetPin,
    userToResetPassword,
    searchTerm,
    isMobile,
    paginatedUsers,
    hasNextPage,
    sentinelRef,
    setScrollRoot,
    canCreateUsers,
    canManageUser,
    setSearchTerm,
    handleOpenNewForm,
    handleEditUser,
    handleSaveUser,
    setIsFormVisible,
    setUserToDelete,
    setUserToResetPin,
    setUserToResetPassword,
    handleDeleteUser,
    handleConfirmResetPassword,
    handleConfirmResetPin,
    refreshUsers,
  };
};
