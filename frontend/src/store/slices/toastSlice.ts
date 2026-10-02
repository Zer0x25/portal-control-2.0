import { StateCreator } from "zustand";
import { ToastMessage, ToastType } from "../../types/index";
import { AppState } from "../types";
import { idFactory } from "../../utils/idFactory";

export interface ToastSlice {
  toasts: ToastMessage[];
  addToast: (message: string, type: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

// Define limits for each type
const TOAST_LIMITS: Record<ToastType, number> = {
  success: 3,
  info: 3,
  warning: 3,
  error: Infinity, // No limit for errors
};

export const createToastSlice: StateCreator<AppState, [], [], ToastSlice> = (set) => ({
  toasts: [],
  addToast: (message: string, type: ToastType = "info", duration = 5000) => {
    const newToast: ToastMessage = { id: idFactory.nanoid(), message, type, duration };

    set((state) => {
      let updatedToasts = [...state.toasts, newToast];

      // Get the limit for the new toast's type
      const limit = TOAST_LIMITS[type];

      // If the type has a limit (i.e., not 'error')
      if (isFinite(limit)) {
        // Get all toasts of the same type as the one just added
        const toastsOfType = updatedToasts.filter((t) => t.type === type);

        // If the limit for this type is exceeded
        if (toastsOfType.length > limit) {
          // Find the ID of the oldest toast of this specific type to remove
          const oldestToastIdToRemove = toastsOfType[0].id;
          // Filter it out from the main list of toasts
          updatedToasts = updatedToasts.filter((t) => t.id !== oldestToastIdToRemove);
        }
      }

      return { toasts: updatedToasts };
    });
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
});
