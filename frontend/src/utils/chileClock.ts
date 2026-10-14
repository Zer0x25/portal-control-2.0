const CHILE_TZ = "America/Santiago";

const chileTimeFormatter = new Intl.DateTimeFormat("es-CL", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: CHILE_TZ,
});

/**
 * HH:mm en hora de Chile con Intl nativo (sin date-fns-tz).
 *
 * Existe porque `dashboardSlice` (store global, preload de boot) solo necesita
 * este formato para `openEditTimestampModal`; importar `utils/formatters`
 * arrastraba `date-fns-tz` (~38KB) al preload inicial. Paridad verificada con
 * `formatInTimeZone(date, "America/Santiago", "HH:mm")` en medianoche,
 * transiciones DST e inválidos.
 */
export const formatChileTimeHHmm = (date: Date): string => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "--:--";
  return chileTimeFormatter.format(date);
};
