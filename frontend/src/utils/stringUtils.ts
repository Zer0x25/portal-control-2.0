/**
 * Normalizes a string by removing diacritics (accents).
 * e.g., "María" becomes "Maria".
 * @param str The string to normalize.
 * @returns The normalized string.
 */
export const normalizeString = (str: string | undefined | null): string => {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};
