/**
 * Política CORS estricta (spec 002 H-01).
 *
 * - `ALLOWED_ORIGINS`: lista separada por comas. Solo esos orígenes.
 * - `"*"` en la lista: abierto SIN credenciales (navegadores lo exigen).
 * - Sin variable: se deniega cross-origin (same-origin y tools no-browser
 *   siguen funcionando porque no envían `Origin`).
 * - `credentials` siempre `false`: el frontend autentica por header
 *   `Authorization`, nunca por cookies (verificado en `src/services`).
 */
export function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS ?? "";
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return true;
  if (allowedOrigins.includes("*")) return true;
  return allowedOrigins.includes(origin);
}
