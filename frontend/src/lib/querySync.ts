import type { QueryClient, QueryKey } from "@tanstack/react-query";

/**
 * Revisa los datos que la pantalla ya está usando durante la sincronización
 * de sesión. Fresh queries respetan su staleTime; una query stale/in-flight
 * no se cancela ni se descarga dos veces.
 *
 * Si cambia la instancia de base de datos, la caché previa puede pertenecer a
 * otra fuente y debe invalidarse aunque aún parezca fresca.
 */
export const refreshActiveQueriesForSync = (
  client: QueryClient,
  queryKey: QueryKey,
  force = false,
): Promise<void> => {
  if (force) {
    return client.invalidateQueries({ queryKey }, { cancelRefetch: false });
  }

  return client.refetchQueries({ queryKey, type: "active", stale: true }, { cancelRefetch: false });
};
