export const MAX_OVERTIME_NORMAL = 2; // Max 2 hours overtime for normal shifts
export const MAX_SHIFT_LENGTH_AFFECTING_OT = 11; // If shift > 11h, assummed 12h/exceptional -> 0 OT allowed

export class OvertimeValidationService {
  /**
   * Validates if a proposed schedule execution violates overtime rules.
   * @param scheduledHours Number of hours scheduled for the day (e.g., 9, 12)
   * @param proposedEntrance ISO date string or HH:mm
   * @param proposedExit ISO date string or HH:mm
   * @param isArticle22 Boolean
   */
  static validate(
    scheduledHours: number,
    proposedEntrance: string | Date,
    proposedExit: string | Date,
    isArticle22: boolean = false,
  ): { valid: boolean; message?: string; overtimeHours?: number } {
    if (isArticle22) return { valid: true, overtimeHours: 0 };

    const entrance = new Date(proposedEntrance);
    const exit = new Date(proposedExit);

    // Basic validity check
    if (isNaN(entrance.getTime()) || isNaN(exit.getTime())) {
      return { valid: false, message: "Horas de entrada o salida inválidas." };
    }

    if (exit <= entrance) {
      return { valid: false, message: "La salida debe ser posterior a la entrada." };
    }

    // Calculate duration in hours
    const workedHours = (exit.getTime() - entrance.getTime()) / (1000 * 60 * 60);

    let estimatedNetWorked = workedHours;
    if (workedHours > 6) {
      // Conservative adjustment for break
      estimatedNetWorked = workedHours - (scheduledHours >= 8 ? 1 : 0.5);
    }

    const overtime = Math.max(0, estimatedNetWorked - scheduledHours);

    // RULE 0: Unscheduled Shifts (Day Off / No Shift)
    // If scheduledHours is ~0, max legal limit is 12 hours total usage.
    if (scheduledHours < 0.1) {
      // 13h presence - 0.5 break = 12.5 worked. This violates 12h limit.
      // We set threshold to 12.05 to allow strict 12h but block 12.5h
      if (estimatedNetWorked > 12.05) {
        return {
          valid: false,
          message: `Trabajo sin turno asignado excede el tope legal de 12 horas diarias (Detectado: ${estimatedNetWorked.toFixed(1)}h).`,
        };
      }
      // If valid under 12h, we allow it. OT will likely be high (e.g. 10h), which is correct for payment.
      return { valid: true, overtimeHours: overtime };
    }

    // RULE 1: Shifts > 11h (e.g. 12h shifts) cannot have OT.
    if (scheduledHours >= MAX_SHIFT_LENGTH_AFFECTING_OT) {
      if (overtime > 0.5) {
        // 30 min tolerance
        return {
          valid: false,
          message: `Jornadas largas (${scheduledHours}h) no permiten horas extras (Detectado: ${overtime.toFixed(1)}h).`,
        };
      }
    }

    // RULE 2: Normal shifts Max 2h OT.
    if (overtime > MAX_OVERTIME_NORMAL + 0.5) {
      // 30 min tolerance
      return {
        valid: false,
        message: `Excede el límite legal de ${MAX_OVERTIME_NORMAL} horas extras diarias (Detectado: ${overtime.toFixed(1)}h).`,
      };
    }

    return { valid: true, overtimeHours: overtime };
  }
}
