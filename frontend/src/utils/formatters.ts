import { formatInTimeZone } from "date-fns-tz";

const CHILE_TZ = "America/Santiago";

/**
 * Formats a Date object into a user-friendly time-only string (HH:mm).
 * Returns '--:--' for invalid inputs.
 */
export const formatTime = (date: Date): string => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return "--:--";
  }
  return formatInTimeZone(date, CHILE_TZ, "HH:mm");
};

/**
 * Formats an ISO-like datetime string (YYYY-MM-DDTHH:mm) into a user-friendly format (DD/MM/YYYY HH:mm).
 * Returns '-' for invalid or empty inputs.
 * @param isoDateTimeString The date-time string to format.
 * @returns The formatted string.
 */
export const formatDisplayDateTime = (isoDateTimeString?: string): string => {
  if (!isoDateTimeString) {
    return "-";
  }
  try {
    // new Date() correctly parses ISO strings into the user's local timezone.
    const date = new Date(String(isoDateTimeString));
    if (isNaN(date.getTime())) return "-";

    return formatInTimeZone(date, CHILE_TZ, "dd/MM/yyyy HH:mm");
  } catch {
    console.error("Error formatting date:", isoDateTimeString);
    return "-";
  }
};

/**
 * Formats an ISO-like date string (YYYY-MM-DD or YYYY-MM-DDTHH:mm) into a user-friendly format (dd-MM-yyyy).
 * @param isoString The date or date-time string to format.
 * @returns The formatted date string (dd-MM-yyyy).
 */
export const formatDisplayDate = (isoString?: string): string => {
  if (!isoString) return "-";
  try {
    const raw = String(isoString);

    // Business dates (YYYY-MM-DD) must not shift across day boundaries by timezone.
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const dateOnlyUtcNoon = new Date(`${raw}T12:00:00.000Z`);
      if (isNaN(dateOnlyUtcNoon.getTime())) return "-";
      return formatInTimeZone(dateOnlyUtcNoon, "UTC", "dd-MM-yyyy");
    }

    const date = new Date(raw);
    if (isNaN(date.getTime())) return "-";
    return formatInTimeZone(date, CHILE_TZ, "dd-MM-yyyy");
  } catch {
    return "-";
  }
};

/**
 * Formats an ISO-like datetime string into a user-friendly time-only format (HH:mm).
 * Returns '-' for invalid inputs.
 * @param isoDateTimeString The date-time string to format.
 * @returns The formatted time string.
 */
export const formatDisplayTime = (isoDateTimeString?: string): string => {
  if (!isoDateTimeString) return "-";
  try {
    const date = new Date(String(isoDateTimeString));
    if (isNaN(date.getTime())) return "-";
    return formatTime(date); // Re-use the robust formatTime function
  } catch {
    return "-";
  }
};

/**
 * Formats a Date object into a string suitable for an <input type="datetime-local">.
 * This MUST be in the local timezone format YYYY-MM-DDTHH:mm. Manual formatting is reliable here.
 * @param date The Date object.
 * @returns The formatted string (YYYY-MM-DDTHH:mm).
 */
export const formatDateToDateTimeLocal = (date: Date): string => {
  return formatInTimeZone(date, CHILE_TZ, "yyyy-MM-dd'T'HH:mm");
};

/**
 * Formats a Date object into HH:mm for <input type="time"> using Chile timezone.
 * @param date The Date object.
 * @returns The formatted string (HH:mm).
 */
export const formatDateToTimeLocal = (date: Date): string => {
  return formatTime(date);
};
/**
 * Formats an ISO timestamp string into a detailed, user-friendly format for logs.
 * @param isoDateTimeString The ISO string from the log.
 * @returns The formatted string (DD/MM/YYYY HH:mm:ss).
 */
export const formatLogTimestamp = (isoDateTimeString?: string): string => {
  if (!isoDateTimeString) return "-";
  try {
    const date = new Date(isoDateTimeString);
    if (isNaN(date.getTime())) return "-";

    return formatInTimeZone(date, CHILE_TZ, "dd/MM/yyyy HH:mm:ss");
  } catch {
    console.error("Error formatting log timestamp:", isoDateTimeString);
    return "-";
  }
};

/**
 * Formats a decimal number representing hours into an HH:mm string.
 * @param decimalHours The hours in decimal format (e.g., 7.77).
 * @returns The formatted time string (e.g., "07:46" or "-01:30").
 */
export const formatDecimalHoursToHHMM = (decimalHours: number): string => {
  if (isNaN(decimalHours) || !isFinite(decimalHours)) {
    return "00:00";
  }

  const sign = decimalHours < 0 ? "-" : "";
  const absHours = Math.abs(decimalHours);

  const totalMinutes = Math.round(absHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const formattedHours = String(hours).padStart(2, "0");
  const formattedMinutes = String(minutes).padStart(2, "0");

  return `${sign}${formattedHours}:${formattedMinutes}`;
};
