import { useQuery } from "@tanstack/react-query";
import { leaveService } from "../../services/leaveService";
import { useAuth } from "../useAuth";
import { queryKeys } from "../../lib/queryKeys";

export const useLeavesQuery = (enabled = true) => {
  const { currentUser } = useAuth();
  const canReadLeaves =
    !!currentUser &&
    ["Super_Administrador", "Administrador", "Supervisor", "Reloj Control"].includes(
      currentUser.role,
    );

  return useQuery({
    queryKey: queryKeys.leaves(),
    queryFn: () => leaveService.getLeaves(),
    enabled: enabled && canReadLeaves,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
