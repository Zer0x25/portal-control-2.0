import { logger } from "./logger";

/**
 * Watchdog Utility
 * Monitorea la salud de procesos largos basándose en un "latido" (heartbeat).
 */
export class Watchdog {
  private timer: NodeJS.Timeout | null = null;
  private lastHeartbeat: number;
  private readonly timeoutMs: number;
  private readonly onTimeout: () => void;
  private readonly name: string;

  constructor(name: string, timeoutMs: number, onTimeout: () => void) {
    this.name = name;
    this.timeoutMs = timeoutMs;
    this.onTimeout = onTimeout;
    this.lastHeartbeat = Date.now();
  }

  /**
   * Inicia el monitoreo.
   */
  public start() {
    if (this.timer) return;

    this.lastHeartbeat = Date.now();
    logger.info("Watchdog iniciado", { name: this.name, timeoutMs: this.timeoutMs });
    this.timer = setInterval(
      () => {
        const now = Date.now();
        if (now - this.lastHeartbeat > this.timeoutMs) {
          logger.warn("Watchdog sin heartbeat", { name: this.name, timeoutMs: this.timeoutMs });
          this.stop();
          this.onTimeout();
        }
      },
      Math.min(this.timeoutMs / 2, 1000),
    );
  }

  /**
   * Registra un latido para resetear el temporizador.
   */
  public heartbeat() {
    this.lastHeartbeat = Date.now();
  }

  /**
   * Detiene el monitoreo.
   */
  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info("Watchdog detenido", { name: this.name });
    }
  }
}
