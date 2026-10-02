import { io, Socket } from "socket.io-client";
import { API_ORIGIN_URL } from "./apiBase";

const SOCKET_URL = API_ORIGIN_URL;

class SocketService {
  private socket: Socket | null = null;

  public connect(): Socket {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        withCredentials: true,
        transports: ["websocket", "polling"],
      });

      this.socket.on("connect", () => {
        console.warn("🔌 Connected to WebSocket server.");
      });

      this.socket.on("disconnect", (reason) => {
        console.warn("🔌 Disconnected from WebSocket server:", reason);
      });
    }
    return this.socket;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
