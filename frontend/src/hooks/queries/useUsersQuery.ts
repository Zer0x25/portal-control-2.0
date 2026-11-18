import { useQuery } from "@tanstack/react-query";
import { userService } from "../../services/userService";
import { authService } from "../../services/authService";
import { User } from "../../types";
import { queryKeys } from "../../lib/queryKeys";
import { useStore } from "../../store/useStore";

/**
 * Cuentas de usuario como única fuente (spec 032 T5).
 *
 * `users` queda fuera del cache persistido por PII (ver
 * `SENSITIVE_QUERY_ROOTS`): en un dispositivo compartido no se conserva nada
 * entre sesiones.
 *
 * Contrato HTTP (`GET /api/users`): solo `Administrador` y `Supervisor_Elevado`
 * pueden consultar el directorio de usuarios; otros roles mantienen la query
 * deshabilitada para evitar 403 en vistas compartidas (Dashboard, Bitácora).
 */
export const useUsersQuery = (options: { readonly enabled?: boolean } = {}) => {
  const hasToken = !!authService.getToken();
  const isForcePasswordChange = useStore((state) => state.currentUser?.mustChangePassword === true);
  const currentUserRole = useStore((state) => state.currentUser?.role);
  const canReadUsers =
    currentUserRole === "Administrador" || currentUserRole === "Supervisor_Elevado";

  return useQuery<User[]>({
    queryKey: queryKeys.users(),
    queryFn: async () => {
      if (!canReadUsers) return [];
      const users = await userService.getAll();
      return users.filter((user) => !user.isDeleted);
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24,
    enabled: hasToken && !isForcePasswordChange && canReadUsers && options.enabled !== false,
  });
};
