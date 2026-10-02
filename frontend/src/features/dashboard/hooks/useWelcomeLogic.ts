import { useMemo, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useEmployees } from "../../../hooks/useEmployees";
import { useWeather } from "../../../hooks/useWeather";
import { useStore } from "../../../store/useStore";
import { WelcomeData } from "../types";

export const useWelcomeLogic = (): WelcomeData => {
  const { weather, isLoading: isLoadingWeather } = useWeather();
  const { currentUser } = useStore(useShallow((s) => ({ currentUser: s.currentUser })));
  const { getEmployeeById } = useEmployees();

  // Memoizar la función de obtención de nombre para evitar recrearla
  const getWelcomeName = useCallback(
    (user: typeof currentUser) => {
      if (!user) return "Invitado";
      return user.employeeId
        ? getEmployeeById(user.employeeId)?.name || user.username
        : user.username;
    },
    [getEmployeeById],
  );

  const welcomeName = useMemo(() => getWelcomeName(currentUser), [currentUser, getWelcomeName]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 20) return "Buenas tardes";
    return "Buenas noches";
  }, []);

  // Memoizar el objeto de retorno para prevenir re-renders innecesarios
  return useMemo(
    () => ({
      weather,
      isLoadingWeather,
      welcomeName,
      greeting,
    }),
    [weather, isLoadingWeather, welcomeName, greeting],
  );
};
