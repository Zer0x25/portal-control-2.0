import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";

export class SocketService {
  private static io: SocketIOServer | null = null;

  public static initialize(httpServer: HTTPServer): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: true, // Matches main CORS policy (reflects request origin)
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    this.io.on("connection", (socket) => {
      console.warn(`[SOCKET] 🟢 User connected: ${socket.id}`);

      // Permitir que el usuario se una a una sala privada basada en su ID
      const userId = socket.handshake.query.userId as string;
      if (userId) {
        socket.join(`user:${userId}`);
        console.warn(`[SOCKET] 🏠 User ${userId} joined private room.`);
      }

      socket.on("disconnect", (reason) => {
        console.warn(`[SOCKET] ⚪ User disconnected: ${socket.id} (${reason})`);
      });
    });

    console.warn("🔌 Socket.io service initialized.");
    return this.io;
  }

  public static getInstance(): SocketIOServer {
    if (!this.io) {
      throw new Error("SocketService not initialized");
    }
    return this.io;
  }

  public static emitToAll(event: string, data: unknown): void {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  /**
   * Alias for emitToAll to maintain backward compatibility
   */
  public static emit(event: string, data: unknown): void {
    this.emitToAll(event, data);
  }

  public static emitToUser(userId: string, event: string, data: unknown): void {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }

  public static disconnectAllClients(reason = "server namespace disconnect"): void {
    if (!this.io) {
      return;
    }

    for (const socket of this.io.sockets.sockets.values()) {
      socket.disconnect(true);
    }
    console.warn(`[SOCKET] Forced disconnect for all clients (${reason}).`);
  }

  public static getIO(): SocketIOServer | null {
    return this.io;
  }
}
