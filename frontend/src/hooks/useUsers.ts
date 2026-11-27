import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { useToasts } from "./useToasts";
import { useUsersQuery } from "./queries/useUsersQuery";
import { User, UserRole } from "../types";
import { userService } from "../services/userService";
import { queryKeys } from "../lib/queryKeys";
import { logger } from "../utils/logger";
import { DEFAULT_TEMPORARY_PASSWORD } from "../constants";

/**
 * Cuentas de usuario: única fuente = `useUsersQuery` (spec 032 T5).
 * El store ya no replica esta colección ni escribe IndexedDB.
 */
export const useUsers = (options: { readonly enabled?: boolean } = {}) => {
  const { data: users = [], isLoading: isLoadingUsers, refetch } = useUsersQuery(options);
  const queryClient = useQueryClient();
  const { addToast } = useToasts();
  const { currentUser } = useAuth();

  const refreshUsers = () => queryClient.invalidateQueries({ queryKey: queryKeys.users() });

  const getUserById = (id: string) => users.find((user) => user.id === id);

  const getUserByUsername = (username: string) => {
    const normalized = username.toLowerCase();
    return users.find((user) => user.username.toLowerCase() === normalized);
  };

  const createUserForEmployee = async (
    employeeId: string,
    fullName: string,
    role: UserRole,
  ): Promise<boolean> => {
    try {
      // Normaliza y parte el nombre para derivar un alias estable.
      const normalize = (value: string) =>
        value
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toUpperCase()
          .replace(/[^A-Z0-9\s]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

      const cleanName = normalize(fullName);
      const parts = cleanName.split(" ").filter(Boolean);
      const firstName = parts[0] || "";
      const firstSurname = parts[1] || "";

      let baseAlias = "";
      if (firstName && firstSurname) {
        baseAlias = `${firstName.charAt(0)}${firstSurname.slice(0, 5)}`;
      } else {
        baseAlias = firstName.slice(0, 6);
      }

      baseAlias = baseAlias.replace(/[^A-Z0-9]/g, "");
      if (!baseAlias) baseAlias = "USER";

      let finalAlias = baseAlias;
      let counter = 2;
      while (users.find((user) => user.username.toUpperCase() === finalAlias.toUpperCase())) {
        finalAlias = `${baseAlias}${String(counter).padStart(2, "0")}`;
        counter++;
      }

      const newUser: Omit<User, "id"> = {
        username: finalAlias,
        role,
        password: DEFAULT_TEMPORARY_PASSWORD,
        mustChangePassword: true,
        employeeId,
        isDeleted: false,
        lastModified: Date.now(),
        syncStatus: "pending",
      };

      await userService.create(newUser as User);
      await refreshUsers();
      addToast(`Usuario '${finalAlias}' creado correctamente para el empleado.`, "success");
      return true;
    } catch (error) {
      logger.error("[useUsers] Error creating user for employee:", error);
      addToast("Error al generar cuenta de usuario automática.", "error");
      return false;
    }
  };

  return {
    users,
    isLoadingUsers,
    refetchUsers: refetch,
    refreshUsers,

    // Actions
    addUser: async (user: Omit<User, "id">): Promise<User | null> => {
      try {
        const newUser = await userService.create(user as User);
        await refreshUsers();
        return newUser;
      } catch (error) {
        logger.error("[useUsers] Error creating user:", error);
        const message = error instanceof Error ? error.message : "Error al crear el usuario.";
        addToast(message, "error");
        return null;
      }
    },
    updateUser: async (
      id: string,
      updates: Partial<Omit<User, "employeeId">> & { employeeId?: string | null },
    ): Promise<boolean> => {
      try {
        await userService.update(id, updates as Partial<User>);
        await refreshUsers();
        return true;
      } catch (error) {
        logger.error("[useUsers] Error updating user:", error);
        const message = error instanceof Error ? error.message : "Error al actualizar el usuario.";
        addToast(message, "error");
        return false;
      }
    },
    deleteUser: async (id: string): Promise<boolean> => {
      try {
        await userService.delete(id);
        await refreshUsers();
        return true;
      } catch (error) {
        logger.error("[useUsers] Error deleting user:", error);
        const message = error instanceof Error ? error.message : "Error al eliminar el usuario.";
        addToast(message, "error");
        return false;
      }
    },

    // Selectors
    getUserById,
    getUserByUsername,

    createUserForEmployee,

    changeOwnPassword: async (data: { newPassword: string }) => {
      if (!currentUser?.id) return false;
      try {
        await userService.update(currentUser.id, {
          password: data.newPassword,
        });
        if (["Super_Administrador", "Administrador"].includes(currentUser.role)) {
          await refreshUsers();
        }
        return true;
      } catch (error) {
        addToast(
          error instanceof Error ? error.message : "Error al actualizar la contraseña.",
          "error",
        );
        return false;
      }
    },
  };
};
