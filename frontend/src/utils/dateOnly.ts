const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses a calendar date at UTC midnight without timezone or DST dependencies. */
export const parseISODateAtUTC = (value: string): Date => {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return new Date(Number.NaN);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(0);
  parsed.setUTCHours(0, 0, 0, 0);
  parsed.setUTCFullYear(year, month - 1, day);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return new Date(Number.NaN);
  }

  return parsed;
};
