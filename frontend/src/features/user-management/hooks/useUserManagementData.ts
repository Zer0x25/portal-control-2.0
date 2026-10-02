import { useState, useEffect, useRef, useMemo } from "react";
import { User, UserRole } from "../../../types/index";
import { useUsers } from "../../../hooks/useUsers";
import { useEmployees } from "../../../hooks/useEmployees";
import { useAuth } from "../../../hooks/useAuth";
import { useToasts } from "../../../hooks/useToasts";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useDebounce } from "../../../hooks/useDebounce";
import { useIntersectionObserver } from "../../../hooks/useIntersectionObserver";

interface UserFormData {
  username: string;
  password?: string;
  role: UserRole;
  employeeId?: string;
}

interface UseUserManagementDataParams {
  isEmbedded?: boolean;
}

const DEFAULT_RESET_CREDENTIAL = ["123", "456"].join("");

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
  const [isMFASetupOpen, setIsMFASetupOpen] = useState(false);

  const isMobile = useMediaQuery("(max-width: 768px)");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const pageSize = isMobile ? 30 : 60;
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const processedUsers = useMemo(() => {
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
  }, [allUsers, debouncedSearchTerm, activeEmployees]);

  const paginatedUsers = useMemo(() => {
    return processedUsers.slice(0, visibleCount);
  }, [processedUsers, visibleCount]);

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

  const canManageUser = (user: User) => {
    if (!currentUser) return false;
    if (currentUser.role === "Administrador") {
      return currentUser.id !== user.id;
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

  const handleSaveUser = async (data: UserFormData) => {
    if (!currentUser) return;
    if (editingUser) {
      await updateUser(editingUser.id, { role: data.role, employeeId: data.employeeId });
    } else {
      if (!data.password) {
        addToast("La contraseña es requerida.", "warning");
        return;
      }
      await addUser({
        username: data.username,
        password: data.password,
        role: data.role,
        employeeId: data.employeeId,
      } as unknown as User);
    }
    refreshUsers();
    setIsFormVisible(false);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete || !currentUser) return;
    await deleteUser(userToDelete.id);
    refreshUsers();
    setUserToDelete(null);
  };

  const handleConfirmResetPin = async () => {
    if (!userToResetPin?.employeeId) return;
    await resetEmployeePin(userToResetPin.employeeId);
    setUserToResetPin(null);
  };

  const handleConfirmResetPassword = async () => {
    if (!userToResetPassword) return;
    await updateUser(userToResetPassword.id, {
      password: DEFAULT_RESET_CREDENTIAL,
      mustChangePassword: true,
    });
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
    isMFASetupOpen,
    isMobile,
    paginatedUsers,
    hasNextPage,
    sentinelRef,
    setScrollRoot,
    canManageUser,
    setSearchTerm,
    handleOpenNewForm,
    handleEditUser,
    handleSaveUser,
    setIsFormVisible,
    setIsMFASetupOpen,
    setUserToDelete,
    setUserToResetPin,
    setUserToResetPassword,
    handleDeleteUser,
    handleConfirmResetPassword,
    handleConfirmResetPin,
    refreshUsers,
  };
};
