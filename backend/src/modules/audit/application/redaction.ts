const marker = "[REDACTED]";
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function sensitive(key: string) {
  const name = key.replace(/[_-]/g, "").toLowerCase();
  return (
    /password|secret|token|apikey|authorization|cookie|credential|recoverycode/.test(name) ||
    name === "pass" ||
    name === "pin"
  );
}
function clean(value: unknown, depth = 0): unknown {
  if (depth > 12) return marker;
  if (Array.isArray(value)) return value.map((entry) => clean(entry, depth + 1));
  if (!object(value)) return value;
  const protectedConfig = value.key === "SMTP_CONFIG" || value.key === "EMAIL_NOTIFICATION_RULES";
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [
        key,
        sensitive(key) || (protectedConfig && ["value", "previousValue", "newValue"].includes(key))
          ? marker
          : clean(entry, depth + 1),
      ]),
  );
}
function fields(value: unknown): Record<string, unknown> {
  if (!object(value)) return {};
  const result = clean(value);
  return object(result) ? result : {};
}
export function redactAuditFields(action: string, details: unknown, metadata: unknown) {
  const result = {
    details: details == null ? null : fields(details),
    metadata: metadata == null ? null : fields(metadata),
  };
  if (action === "UNHANDLED_ERROR") {
    if (result.details && "message" in result.details)
      result.details.message = "Error al procesar solicitud";
    if (result.details && "stack" in result.details) result.details.stack = marker;
    for (const key of ["body", "query"])
      if (result.metadata && key in result.metadata) result.metadata[key] = marker;
  }
  return result;
}
