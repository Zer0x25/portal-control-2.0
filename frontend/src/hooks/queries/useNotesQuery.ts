import { useQuery } from "@tanstack/react-query";
import { noteService } from "../../services/noteService";
import { useAuth } from "../useAuth";
import { queryKeys } from "../../lib/queryKeys";

export const useNotesQuery = () => {
  const { currentUser } = useAuth();

  return useQuery({
    queryKey: queryKeys.notes(),
    queryFn: async () => {
      if (!currentUser) return [];
      return await noteService.getAll();
    },
    enabled: !!currentUser,
    staleTime: 1000 * 60 * 5, // 5 mins
  });
};
