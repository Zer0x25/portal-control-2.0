export const isValidChileanRut = (rut: string): boolean => {
  if (!/^[0-9]+-[0-9kK]{1}$/.test(rut)) return false;
  const [rutBody, dv] = rut.split("-");
  let M = 0,
    S = 1;
  for (let T = parseInt(rutBody, 10); T; T = Math.floor(T / 10)) {
    S = (S + (T % 10) * (9 - (M++ % 6))) % 11;
  }
  const calculatedDv = S ? String(S - 1) : "K";
  return calculatedDv.toUpperCase() === dv.toUpperCase();
};

/**
 * Checks if a given start date is not after an end date.
 * Designed for YYYY-MM-DD string formats, where direct string comparison is reliable.
 * @param startDate The start date string (e.g., '2024-08-15').
 * @param endDate The end date string (e.g., '2024-08-16').
 * @returns True if the date range is valid, false otherwise.
 */
export const isDateRangeValid = (startDate: string, endDate: string): boolean => {
  if (!startDate || !endDate) {
    // Let form validation handle required fields; don't flag incomplete ranges as invalid.
    return true;
  }
  // For YYYY-MM-DD format, direct string comparison is safe and avoids timezone issues.
  return startDate <= endDate;
};
