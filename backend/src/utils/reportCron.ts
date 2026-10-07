import { CronExpressionParser } from "cron-parser";
import { ValidationError } from "./AppError";

export const REPORT_TIMEZONE = "America/Santiago";

/** Five deterministic fields; the same parser serves validation, persistence and runtime. */
export function nextReportRun(expression: string, now: Date): Date {
  if (
    expression.length > 256 ||
    expression.trim().split(/\s+/).length !== 5 ||
    /(^|[\s,/-])H(?=$|[\s(/,-])/i.test(expression) ||
    expression.includes("?")
  )
    throw new ValidationError("Cron inválido: usa cinco campos deterministas");
  try {
    return CronExpressionParser.parse(expression, {
      currentDate: now,
      tz: REPORT_TIMEZONE,
    })
      .next()
      .toDate();
  } catch {
    throw new ValidationError("Expresión cron inválida o sin próxima ejecución");
  }
}
export function validReportCron(expression: string): boolean {
  try {
    nextReportRun(expression, new Date("2026-01-01T00:00:00Z"));
    return true;
  } catch {
    return false;
  }
}
