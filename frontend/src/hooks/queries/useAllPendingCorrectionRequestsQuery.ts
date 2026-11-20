import { useQuery } from "@tanstack/react-query";
import { correctionService } from "../../services/correctionService";
import type { CorrectionRequest } from "../../types";
import { queryKeys } from "../../lib/queryKeys";
import { useAuth } from "../useAuth";

/**
 * Lee en una sola respuesta todas las solicitudes pendientes del usuario.
 * El filtro pending limita el resultado y evita que las resoluciones que ocurren
 * entre páginas desplacen filas y oculten solicitudes pendientes.
 */
export const fetchAllPendingCorrectionRequests = async (): Promise<CorrectionRequest[]> => {
  const result = await correctionService.getAll({ status: "pending" });
  return result.requests.filter((request) => request.status === "pending");
};

export const useAllPendingCorrectionRequestsQuery = (enabled = true) => {
  const { currentUser } = useAuth();

  return useQuery({
    queryKey: queryKeys.correctionRequestsList({
      status: "pending",
      complete: true,
      userId: currentUser?.id,
    }),
    queryFn: fetchAllPendingCorrectionRequests,
    enabled: enabled && Boolean(currentUser),
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 30,
  });
};
