import { useQuery } from "@tanstack/react-query";
import { noteService } from "../../services/noteService";
import { useAuth } from "../useAuth";

export const useNotesQuery = () => {
  const { currentUser } = useAuth();

  return useQuery({
    queryKey: ["notes"],
    queryFn: async () => {
      if (!currentUser) return [];
      return await noteService.getAll();
    },
    enabled: !!currentUser,
    staleTime: 1000 * 60 * 5, // 5 mins
  });
};
