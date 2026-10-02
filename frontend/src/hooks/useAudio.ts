import { useCallback } from "react";
import { useStore } from "../store/useStore";

export type SoundType = "success" | "error" | "notify" | "warning" | "info" | "click" | "pop";

const soundModules: Record<SoundType, () => Promise<string>> = {
  success: () => import("../assets/sounds/success.mp3").then((module) => module.default),
  error: () => import("../assets/sounds/error.mp3").then((module) => module.default),
  notify: () => import("../assets/sounds/notify.mp3").then((module) => module.default),
  warning: () => import("../assets/sounds/warning.mp3").then((module) => module.default),
  info: () => import("../assets/sounds/notify.mp3").then((module) => module.default),
  click: () => import("../assets/sounds/click.mp3").then((module) => module.default),
  pop: () => import("../assets/sounds/pop.mp3").then((module) => module.default),
};

// Priority Table: Higher number wins or interrupts
const PRIORITIES: Record<SoundType, number> = {
  error: 100,
  warning: 80,
  success: 60,
  notify: 40,
  pop: 45,
  info: 20,
  click: 10,
};

// Minimum gap (ms) between sounds of the same or lower priority to avoid "crowding"
const MIN_GAP_MS = 150;

// Singleton Infrastructure
const audioPool: Partial<Record<SoundType, HTMLAudioElement>> = {};
const loadingPool: Partial<Record<SoundType, Promise<HTMLAudioElement | null>>> = {};
let lastPlayTime = 0;
let currentPriority = 0;

const loadAudio = async (type: SoundType): Promise<HTMLAudioElement | null> => {
  const cachedAudio = audioPool[type];
  if (cachedAudio) return cachedAudio;

  const inFlight = loadingPool[type];
  if (inFlight) return inFlight;

  const moduleLoader = soundModules[type];
  if (!moduleLoader || typeof window === "undefined") return null;

  const audioPromise = moduleLoader()
    .then((url) => {
      const audio = new Audio(url);
      audio.preload = "none";
      audio.onended = () => {
        currentPriority = 0;
      };
      audioPool[type] = audio;
      return audio;
    })
    .catch(() => null)
    .finally(() => {
      delete loadingPool[type];
    });

  loadingPool[type] = audioPromise;
  return audioPromise;
};

export const useAudio = () => {
  const soundEnabled = useStore((state) => state.soundEnabled);

  const play = useCallback(
    async (type: SoundType) => {
      if (!soundEnabled || typeof window === "undefined") return;

      const now = Date.now();
      const priority = PRIORITIES[type];

      // SATURATION LOGIC:
      // 1. If a higher priority sound is requested, it interrupts current sound.
      // 2. If same priority, respect MIN_GAP_MS to avoid "machine gun" effect.
      // 3. If lower priority and we are in a window, ignore.

      const isHighPriorityInterrupt = priority > currentPriority;
      const isCooldownOver = now - lastPlayTime > MIN_GAP_MS;

      if (!isHighPriorityInterrupt && !isCooldownOver) {
        return; // Ignore to prevent saturation
      }

      try {
        const audio = await loadAudio(type);
        if (!audio) return;

        // If we are interrupting, stop all other sounds in the pool
        if (isHighPriorityInterrupt) {
          Object.values(audioPool).forEach((a) => {
            if (!a.paused) {
              a.pause();
              a.currentTime = 0;
            }
          });
        }

        audio.currentTime = 0;
        lastPlayTime = now;
        currentPriority = priority;

        audio.play().catch(() => {
          // Silent catch for autoplay policy
        });
      } catch (error) {
        console.error("[useAudio] Manager error:", error);
      }
    },
    [soundEnabled],
  );

  return { play };
};
