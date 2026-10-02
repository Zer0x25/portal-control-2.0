import { StateCreator } from "zustand";
import { Theme } from "../../types/index";
import { AppState } from "../types";
import { STORAGE_KEYS } from "../../constants";

export interface ThemeSlice {
  theme: Theme;
  effectiveTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  _applyTheme: (theme: Theme) => void;
}

export const createThemeSlice: StateCreator<AppState, [], [], ThemeSlice> = (set, get) => ({
  theme: (localStorage.getItem(STORAGE_KEYS.THEME) as Theme) || "system",
  effectiveTheme: "light",
  _applyTheme: (theme) => {
    let effective: "light" | "dark";
    if (theme === "system") {
      effective = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } else {
      effective = theme;
    }

    // Disable transitions temporarily to avoid "dirty" color blending during the switch
    const disableTransitions = () => {
      const css = document.createElement("style");
      css.id = "disable-transitions";
      css.appendChild(
        document.createTextNode(
          `* { -webkit-transition: none !important; -moz-transition: none !important; -o-transition: none !important; -ms-transition: none !important; transition: none !important; }`,
        ),
      );
      document.head.appendChild(css);
      return css;
    };

    disableTransitions();

    document.documentElement.classList.toggle("dark", effective === "dark");

    // Force a paint record
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    window.getComputedStyle(document.body).opacity;

    set({ effectiveTheme: effective });

    // Re-enable transitions after the class change has settled
    requestAnimationFrame(() => {
      const el = document.getElementById("disable-transitions");
      if (el) document.head.removeChild(el);
    });
  },
  setTheme: (theme) => {
    set({ theme });
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    get()._applyTheme(theme);
  },
  toggleTheme: () => {
    const currentEffectiveTheme = get().effectiveTheme;
    get().setTheme(currentEffectiveTheme === "dark" ? "light" : "dark");
  },
});
