import { SocketService } from "./socketService";

export enum NotificationType {
  INFO = "info",
  SUCCESS = "success",
  WARNING = "warning",
  ERROR = "error",
}

export interface NotificationPayload {
  title: string;
  message: string;
  type: NotificationType;
  category?: string;
  metadata?: unknown;
}

export class NotificationService {
  /**
   * Dispatches a notification to all connected clients via WebSockets
   */
  static notifyAll(payload: NotificationPayload) {
    // 1. WebSocket Broadcast
    SocketService.emitToAll("system_notification", payload);

    // 2. Internal Logging
    if (payload.type === NotificationType.ERROR || payload.type === NotificationType.WARNING) {
      console.warn(
        `[NOTIFICATION_${payload.type.toUpperCase()}] ${payload.title}: ${payload.message}`,
      );
    }
  }

  /**
   * Dispatches a notification to a specific user
   */
  static notifyUser(userId: string, payload: NotificationPayload) {
    SocketService.emitToUser(userId, "user_notification", payload);
  }
}
