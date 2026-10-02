export interface Syncable {
  lastModified: string | number; // Unix timestamp in ms or ISO string
  createdAt?: string | number; // Unix timestamp or ISO string
  syncStatus: "synced" | "pending" | "error";
  isDeleted: boolean;
  syncError?: string; // To store the error message from the backend
}

export interface AppSetting extends Syncable {
  id: string; // Name of the setting/counter, e.g., 'employeeIdCounter'
  /** Arbitrary persisted value. Read it through `getSettingValue<T>()`, which
   * narrows to the caller's expected type. */
  value: unknown;
}
