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

    console.warn(`[Watchdog:${this.name}] Monitoreo iniciado (${this.timeoutMs}ms)`);
    this.timer = setInterval(
      () => {
        const now = Date.now();
        if (now - this.lastHeartbeat > this.timeoutMs) {
          console.error(
            `[Watchdog:${this.name}] ¡TIMEOUT DETECTADO! No se recibió heartbeat en ${this.timeoutMs}ms.`,
          );
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
      console.warn(`[Watchdog:${this.name}] Monitoreo detenido.`);
    }
  }
}
