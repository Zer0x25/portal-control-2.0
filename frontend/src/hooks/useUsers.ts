import { useStore } from "../store/useStore";
import { useAuth } from "./useAuth";
import { User } from "../types";
import { userService } from "../services/userService";

export const useUsers = () => {
  const users = useStore((state) => state.users);
  const isLoadingUsers = useStore((state) => state.isLoadingUsers);
  const loadUsers = useStore((state) => state.loadUsers);
  const getUserByIdFromStore = useStore((state) => state.getUserById);
  const getUserByUsernameFromStore = useStore((state) => state.getUserByUsername);
  const createUserForEmployeeInSlice = useStore((state) => state.createUserForEmployee);
  const { currentUser } = useAuth();

  return {
    users,
    isLoadingUsers,
    refreshUsers: loadUsers,

    // Actions
    addUser: async (user: Omit<User, "id">): Promise<User | null> => {
      try {
        const newUser = await userService.create(user as User);
        await loadUsers();
        return newUser;
      } catch {
        return null;
      }
    },
    updateUser: async (id: string, updates: Partial<User>) => {
      try {
        await userService.update(id, updates);
        await loadUsers();
        return true;
      } catch {
        return false;
      }
    },
    deleteUser: async (id: string) => {
      await userService.delete(id);
      await loadUsers();
    },

    // Selectors
    getUserById: getUserByIdFromStore,
    getUserByUsername: getUserByUsernameFromStore,

    // Composite Actions - Now delegated to slice
    createUserForEmployee: createUserForEmployeeInSlice,

    changeOwnPassword: async (data: { newPassword: string }) => {
      if (!currentUser?.id) return false;
      try {
        await userService.update(currentUser.id, {
          password: data.newPassword,
        });
        await loadUsers();
        return true;
      } catch {
        return false;
      }
    },
  };
};
