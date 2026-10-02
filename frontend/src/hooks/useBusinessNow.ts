import { useEffect, useState } from "react";
import { useStore } from "../store/useStore";

interface UseBusinessNowOptions {
  tickMs?: number | null;
}

const getCurrentServerTimeOffset = (): number => {
  const store = useStore as typeof useStore & {
    getState?: () => { serverTimeOffset?: number };
  };

  if (typeof store.getState === "function") {
    return store.getState().serverTimeOffset ?? 0;
  }

  return 0;
};

export const getBusinessNow = (serverTimeOffset: number = getCurrentServerTimeOffset()): Date => {
  return new Date(Date.now() + serverTimeOffset);
};

export const useBusinessNow = (options: UseBusinessNowOptions = {}): Date => {
  const { tickMs = 1000 } = options;
  const serverTimeOffset = useStore((state) => state.serverTimeOffset ?? 0);
  const [currentTime, setCurrentTime] = useState<Date>(() => getBusinessNow(serverTimeOffset));

  useEffect(() => {
    setCurrentTime(getBusinessNow(serverTimeOffset));

    if (!tickMs || tickMs <= 0) {
      return undefined;
    }

    const ticker = window.setInterval(() => {
      setCurrentTime(getBusinessNow(serverTimeOffset));
    }, tickMs);

    return () => {
      window.clearInterval(ticker);
    };
  }, [serverTimeOffset, tickMs]);

  return currentTime;
};
