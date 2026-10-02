import { StateCreator } from "zustand";
import { AppState } from "../types";
import { STORAGE_KEYS } from "../../constants";

export interface UxSlice {
  isGlobalLoading: boolean;
  isProcessing: boolean;
  processingCount: number;
  loadingProgress: number;
  soundEnabled: boolean;
  setGlobalLoading: (isLoading: boolean) => void;
  incrementProcessing: () => void;
  decrementProcessing: () => void;
  setProcessing: (isProcessing: boolean) => void;
  setLoadingProgress: (progress: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
  startLoading: () => void;
  stopLoading: () => void;
}

export const createUxSlice: StateCreator<AppState, [], [], UxSlice> = (set) => ({
  isGlobalLoading: false,
  isProcessing: false,
  processingCount: 0,
  loadingProgress: 0,
  soundEnabled: localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED) !== "false", // Default to true

  setGlobalLoading: (isLoading) => set({ isGlobalLoading: isLoading }),

  incrementProcessing: () =>
    set((state) => {
      const nextCount = state.processingCount + 1;
      return { processingCount: nextCount, isProcessing: nextCount > 0 };
    }),

  decrementProcessing: () =>
    set((state) => {
      const nextCount = Math.max(0, state.processingCount - 1);
      return { processingCount: nextCount, isProcessing: nextCount > 0 };
    }),

  setProcessing: (isProcessing) =>
    set((state) => ({
      isProcessing,
      processingCount: isProcessing ? Math.max(state.processingCount, 1) : 0,
    })),

  setLoadingProgress: (progress) => set({ loadingProgress: progress }),

  setSoundEnabled: (enabled) => {
    set({ soundEnabled: enabled });
    localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, enabled.toString());
  },

  startLoading: () => set({ isGlobalLoading: true, loadingProgress: 10 }),

  stopLoading: () => {
    set({ loadingProgress: 100 });
    setTimeout(() => {
      set({ isGlobalLoading: false, loadingProgress: 0 });
    }, 200);
  },
});
