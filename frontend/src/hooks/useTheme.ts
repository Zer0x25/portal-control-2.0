import { useStore } from "../store/useStore";

export const useTheme = () => {
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);
  const effectiveTheme = useStore((state) => state.effectiveTheme);
  const toggleTheme = useStore((state) => state.toggleTheme);
  return { theme, setTheme, effectiveTheme, toggleTheme };
};
