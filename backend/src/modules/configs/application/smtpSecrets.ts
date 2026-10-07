import { ValidationError } from "../../../utils/AppError";
const mask = "********";
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
const secret = (key: string) =>
  /password|secret|token|apikey|credential/i.test(key) || key === "pass";
export function maskConfigValue(key: string, value: unknown): unknown {
  if (key !== "SMTP_CONFIG") return value;
  function walk(entry: unknown): unknown {
    if (Array.isArray(entry)) return entry.map(walk);
    if (!object(entry)) return entry;
    return Object.fromEntries(
      Object.entries(entry).map(([field, child]) => [
        field,
        secret(field) ? (child ? mask : "") : walk(child),
      ]),
    );
  }
  return walk(value);
}
export function mergeSmtpSecrets(next: unknown, previous: unknown): unknown {
  if (Array.isArray(next))
    return next.map((entry, index) =>
      mergeSmtpSecrets(entry, Array.isArray(previous) ? previous[index] : undefined),
    );
  if (!object(next)) return next;
  const old = object(previous) ? previous : {};
  const retains = Object.entries(next).some(([key, value]) => secret(key) && value === mask);
  if (retains && ["host", "user", "port", "secure"].some((key) => next[key] !== old[key]))
    throw new ValidationError("Ingresa una contraseña nueva al cambiar servidor o usuario SMTP");
  return Object.fromEntries(
    Object.entries(next).map(([key, value]) => {
      if (secret(key) && value === mask) {
        if (typeof old[key] !== "string" || !old[key] || old[key] === mask)
          throw new ValidationError("No existe una contraseña SMTP guardada");
        return [key, old[key]];
      }
      return [key, mergeSmtpSecrets(value, old[key])];
    }),
  );
}
