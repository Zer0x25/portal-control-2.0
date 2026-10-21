import { useQuery } from "@tanstack/react-query";
import { userService } from "../../services/userService";
import { authService } from "../../services/authService";
import { User } from "../../types";

/**
 * Cuentas de usuario como única fuente (spec 032 T5).
 *
 * `users` queda fuera del cache persistido por PII (ver
 * `SENSITIVE_QUERY_ROOTS`): en un dispositivo compartido no se conserva nada
 * entre sesiones.
 */
export const useUsersQuery = () => {
  const hasToken = !!authService.getToken();

  return useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const users = await userService.getAll();
      return users.filter((user) => !user.isDeleted);
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: hasToken,
  });
};
