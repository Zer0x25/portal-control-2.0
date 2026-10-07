/** Protected settings retain credentials in storage, never in new audit details. */
export function configAuditValue(key: string, value: unknown): unknown {
  if (value == null) return null;
  return key === "SMTP_CONFIG" || key === "EMAIL_NOTIFICATION_RULES" ? "[REDACTED]" : value;
}
