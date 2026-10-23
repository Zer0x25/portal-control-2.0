import { useShallow } from "zustand/react/shallow";
import { useEmployees } from "../../../hooks/useEmployees";
import { useWeather } from "../../../hooks/useWeather";
import { useStore } from "../../../store/useStore";
import { WelcomeData } from "../types";

export const useWelcomeController = (): WelcomeData => {
  const { weather, isLoading: isLoadingWeather } = useWeather();
  const { currentUser } = useStore(useShallow((s) => ({ currentUser: s.currentUser })));
  const { getEmployeeById } = useEmployees();

  // Memoizar la función de obtención de nombre para evitar recrearla
  const getWelcomeName = (user: typeof currentUser) => {
    if (!user) return "Invitado";
    return user.employeeId
      ? getEmployeeById(user.employeeId)?.name || user.username
      : user.username;
  };

  const welcomeName = getWelcomeName(currentUser);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 20) return "Buenas tardes";
    return "Buenas noches";
  })();

  // Memoizar el objeto de retorno para prevenir re-renders innecesarios
  return {
    weather,
    isLoadingWeather,
    welcomeName,
    greeting,
  };
};
