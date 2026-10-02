import { ulid } from "ulid";
import { nanoid } from "nanoid";

/**
 * A factory for creating various types of unique IDs.
 * Centralizes ID generation for consistency and easier maintenance.
 */
export const idFactory = {
  /**
   * Generates a ULID (Universally Unique Lexicographically Sortable Identifier).
   * Ideal for primary keys that need to be sortable by time.
   */
  ulid: (): string => ulid(),

  /**
   * Generates a NanoID, a short, URL-friendly unique ID.
   * @param length The desired length of the ID. Defaults to 21.
   */
  nanoid: (length: number = 21): string => nanoid(length),

  /**
   * Generates a simple timestamp-based ID with a random suffix.
   * Less robust than ULID or NanoID, but can be useful for simple cases.
   */
  timestampedId: (): string =>
    `${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`,
};
