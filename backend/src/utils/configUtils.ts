/**
 * Safely parses a string that might be a JSON or a raw string value.
 * Useful for handling configuration values from the database that might
 * be stored inconsistently (e.g., "2026-01-01" vs 2026-01-01).
 */
export const safeJsonParse = <T = unknown>(
  value: string | null | undefined,
  defaultValue: T | null = null,
): T | null => {
  if (value === null || value === undefined || value === "null") {
    return defaultValue;
  }

  try {
    return JSON.parse(value);
  } catch {
    // If it fails to parse as JSON, check if it's a non-empty string that looks like a value
    // (e.g., a raw date string or a simple config string)
    if (typeof value === "string" && value.trim() !== "") {
      return value as unknown as T;
    }
    return defaultValue;
  }
};
