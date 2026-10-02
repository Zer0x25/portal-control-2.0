import { useBusinessNow } from "./useBusinessNow";

/**
 * Hook to provide a synchronized server time.
 * Consumes the global offset from the store and maintains a 1s tick.
 */
export const useServerTime = () => {
  return useBusinessNow();
};
