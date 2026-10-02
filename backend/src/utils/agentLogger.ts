import fs from "fs";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "agent-debug.log");

/**
 * Canales de contexto soportados por el logger.
 * Se exporta para reutilizar el tipo en los call sites sin duplicar la unión.
 */
export type AgentLogContext = "AUTH" | "SYNC" | "KPI" | "DB" | "SYSTEM";

type ErrorLike = { message?: unknown };

const isErrorLike = (value: unknown): value is ErrorLike =>
  value !== null &&
  (typeof value === "object" || typeof value === "function") &&
  "message" in value;

/**
 * Reproduce el detalle historicamente usado: `error.message || JSON.stringify(error)`.
 * Se mantiene el mismo orden de preferencia para no alterar la salida del log.
 */
const extractErrorDetail = (error: unknown): unknown => {
  if (isErrorLike(error)) {
    const message = error.message;
    if (message) return message;
  }
  return JSON.stringify(error);
};

/**
 * Proactive Agent Logger
 * Dedicated logging for AI Agents to understand system state without user intervention.
 */
export class AgentLogger {
  private static ensureDir() {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  }

  static log(message: string, context: AgentLogContext = "SYSTEM") {
    this.ensureDir();
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${context}] ${message}\n`;

    try {
      fs.appendFileSync(LOG_FILE, logEntry);
    } catch (err) {
      console.error("❌ Failed to write to agent-debug.log:", err);
    }
  }

  static error(message: string, error?: unknown, context: AgentLogContext = "SYSTEM") {
    const errorDetail = error ? ` | Error: ${extractErrorDetail(error)}` : "";
    this.log(`ERROR: ${message}${errorDetail}`, context);
  }
}
