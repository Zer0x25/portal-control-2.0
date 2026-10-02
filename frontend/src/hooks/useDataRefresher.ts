/**
 * A custom hook to refresh core application data.
 * Core data (Users, Employees, Config) is now synced via Zustand and Smart Delta Sync.
 */
export const useDataRefresher = () => {
  // Global synchronization is handled by createSyncSlice (runSync)
  // currently triggered during app initialization and specific events.
  return null;
};
