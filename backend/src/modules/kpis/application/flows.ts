import { ValidationError } from "../../../utils/AppError";
import type { KpiDependencies, KpiInput } from "./contracts";
export function createKpiFlows<Summary, Detailed, Overview, Daily>(
  deps: KpiDependencies<Summary, Detailed, Overview, Daily>,
) {
  function normalize(input: KpiInput): KpiInput {
    const { startDate, endDate, endDateExclusive, employeeIds, area } = input;
    if (!startDate || (!endDate && !endDateExclusive))
      throw new ValidationError("startDate and (endDate or endDateExclusive) are required");
    const end = endDateExclusive || deps.dates.exclusive(startDate, endDate!);
    if (deps.dates.compare(startDate, end) >= 0)
      throw new ValidationError("La fecha de inicio debe ser anterior a la fecha de término");
    const years = employeeIds && employeeIds.length === 1 ? 5 : 1;
    if (deps.dates.duration(startDate, end) > years * 365.25 * 24 * 60 * 60 * 1000)
      throw new ValidationError(
        `El rango de fechas no puede exceder ${years} ${years === 1 ? "año" : "años"} para proteger el rendimiento`,
      );
    return { startDate, endDateExclusive: end, endDate, employeeIds, area };
  }
  return {
    async summary(input: KpiInput) {
      return deps.service.summary(normalize(input));
    },
    async detailed(input: KpiInput) {
      return deps.service.detailed(normalize(input));
    },
    async overview() {
      return deps.service.overview();
    },
    async daily() {
      return deps.service.daily();
    },
  };
}
export type KpiFlows = ReturnType<typeof createKpiFlows>;
