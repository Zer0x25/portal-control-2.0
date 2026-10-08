/**
 * Normalizes a string by removing diacritics (accents).
 * e.g., "María" becomes "Maria".
 */
export const normalizeString = (str: string | undefined | null): string => {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

/**
 * Narrows an HTTP query value to a single string.
 *
 * `req.query` is typed as `string | ParsedQs | (string | ParsedQs)[]`, so reaching
 * a service that expects a plain `string` normally requires a blind `as string`
 * cast. A client can send `?area=a&area=b` or `?area[a]=b`, producing an array or
 * a nested object that would otherwise leak into the database layer as
 * `"[object Object]"` or `"a,b"`. This returns a value only when it truly is one
 * string, so callers get `undefined` instead of a corrupted filter.
 */
export const queryString = (value: unknown): string | undefined => {
  return typeof value === "string" && value.length > 0 ? value : undefined;
};
