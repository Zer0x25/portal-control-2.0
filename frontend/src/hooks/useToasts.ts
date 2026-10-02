import { useCallback } from "react";
import { useStore } from "../store/useStore";
import { useAudio, SoundType } from "./useAudio";
import { ToastType } from "../types/ui";

export const useToasts = () => {
  const toasts = useStore((state) => state.toasts);
  const addToastRaw = useStore((state) => state.addToast);
  const removeToast = useStore((state) => state.removeToast);
  const { play } = useAudio();

  const addToast = useCallback(
    (message: string, type: ToastType = "info", duration?: number) => {
      addToastRaw(message, type, duration);

      // Map ToastType to SoundType
      // They happen to be named the same currently: success, error, warning, info
      play(type as SoundType);
    },
    [addToastRaw, play],
  );

  return { toasts, addToast, removeToast };
};
