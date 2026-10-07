import { Server as SocketIOServer, type Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { projectRealtimeEvent } from "../modules/realtime";
import type { AuthUser } from "../modules/auth";
import { getAllowedOrigins, isOriginAllowed } from "../utils/corsPolicy";
import { logger } from "../utils/logger";

export interface SocketSecurity {
  authenticate(token: string): Promise<AuthUser>;
  authorize(tokens: string[]): Promise<Set<string>>;
  allowedOrigins: string[];
}
const defaultSecurity: SocketSecurity = {
  authenticate: async (token) => {
    const { workCoordinator } = await import("./workCoordinator");
    return workCoordinator.run(
      "socket-auth",
      async () => (await import("./authentication")).authenticateAccessToken(token),
      true,
    );
  },
  authorize: async (tokens) => {
    const { workCoordinator } = await import("./workCoordinator");
    return workCoordinator.run(
      "socket-authorize",
      async () => (await import("./socketAuthentication")).authorizeSocketTokens(tokens),
      true,
    );
  },
  allowedOrigins: [],
};

export class SocketService {
  private static io: SocketIOServer | null = null;

  private static security: SocketSecurity = defaultSecurity;
  private static sweep: ReturnType<typeof setInterval> | undefined;
  private static pending: Promise<void> = Promise.resolve();
  private static identities = new Map<string, { token: string; user: AuthUser }>();

  public static initialize(httpServer: HTTPServer, security?: SocketSecurity): SocketIOServer {
    if (this.io) throw new Error("SocketService already initialized");
    this.security = security ?? { ...defaultSecurity, allowedOrigins: getAllowedOrigins() };
    const allowedOrigins = this.security.allowedOrigins;
    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: (origin, callback) => callback(null, isOriginAllowed(origin, allowedOrigins)),
        methods: ["GET", "POST"],
        credentials: false,
      },
      allowRequest: (request, callback) =>
        callback(null, isOriginAllowed(request.headers.origin, allowedOrigins)),
      transports: ["websocket", "polling"],
    });
    this.io = io;
    const principals = new WeakMap<Socket, { token: string; user: AuthUser }>();
    io.use((socket, next) => {
      const token: unknown = socket.handshake.auth.token;
      if (typeof token !== "string" || !token) return next(new Error("Unauthorized"));
      void this.security
        .authenticate(token)
        .then((user) => {
          if (this.io !== io) return next(new Error("Unauthorized"));
          principals.set(socket, { token, user });
          next();
        })
        .catch(() => next(new Error("Unauthorized")));
    });
    io.on("connection", (socket) => {
      const identity = principals.get(socket);
      if (!identity) {
        socket.disconnect(true);
        return;
      }
      this.identities.set(socket.id, identity);
      void socket.join(`user:${identity.user.id}`);
      socket.on("disconnect", () => this.identities.delete(socket.id));
    });
    this.sweep = setInterval(() => this.deliver(), 30000);
    this.sweep.unref();
    logger.info("Socket service initialized");
    return io;
  }

  /** Serialize delivery and fail closed; every outbound batch rechecks live sessions. */
  private static deliver(event?: string, data?: unknown, userId?: string): void {
    const io = this.io;
    if (!io) return;
    this.pending = this.pending
      .then(async () => {
        if (this.io !== io) return;
        const snapshot = [...this.identities.entries()];
        const valid = await this.security.authorize(snapshot.map(([, identity]) => identity.token));
        if (this.io !== io) return;
        for (const [id, identity] of snapshot) {
          const socket = io.sockets.sockets.get(id);
          if (!socket) continue;
          if (!valid.has(identity.token)) {
            socket.disconnect(true);
            continue;
          }
          if (event) {
            const delivery = projectRealtimeEvent(event, data, identity.user, userId);
            if (delivery) socket.emit(event, delivery.payload);
          }
        }
      })
      .catch(() => {
        if (this.io === io) io.disconnectSockets(true);
        logger.warn("Socket session validation failed; clients disconnected");
      });
  }

  public static async close(): Promise<void> {
    const io = this.io;
    if (!io) return;
    this.io = null;
    clearInterval(this.sweep);
    this.sweep = undefined;
    this.identities.clear();
    await this.pending;
    await new Promise<void>((resolve, reject) =>
      io.close((error) => {
        if (error && error.message !== "Server is not running.") reject(error);
        else resolve();
      }),
    );
  }

  public static getInstance(): SocketIOServer {
    if (!this.io) {
      throw new Error("SocketService not initialized");
    }
    return this.io;
  }

  public static emitToAll(event: string, data: unknown): void {
    if (event === "auth:force_logout") {
      // Revocation itself must reach already authenticated clients after sessions are deleted.
      for (const [id, identity] of this.identities) {
        const delivery = projectRealtimeEvent(event, data, identity.user);
        if (delivery) this.io?.sockets.sockets.get(id)?.emit(event, delivery.payload);
      }
      return;
    }
    this.deliver(event, data);
  }

  /**
   * Alias for emitToAll to maintain backward compatibility
   */
  public static emit(event: string, data: unknown): void {
    this.emitToAll(event, data);
  }

  public static emitToUser(userId: string, event: string, data: unknown): void {
    this.deliver(event, data, userId);
  }

  public static disconnectAllClients(reason = "server namespace disconnect"): void {
    if (!this.io) {
      return;
    }

    for (const socket of this.io.sockets.sockets.values()) {
      socket.disconnect(true);
    }
    logger.info("Socket clients disconnected", { reason });
  }

  public static getIO(): SocketIOServer | null {
    return this.io;
  }
}
