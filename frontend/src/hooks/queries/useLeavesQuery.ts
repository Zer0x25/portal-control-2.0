import { useQuery } from "@tanstack/react-query";
import { leaveService } from "../../services/leaveService";
import { useAuth } from "../useAuth";

export const useLeavesQuery = () => {
  const { currentUser } = useAuth();
  const canReadLeaves =
    !!currentUser &&
    ["Administrador", "Supervisor Elevado", "Supervisor", "Reloj Control"].includes(
      currentUser.role,
    );

  return useQuery({
    queryKey: ["leaves"],
    queryFn: () => leaveService.getLeaves(),
    enabled: canReadLeaves,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
