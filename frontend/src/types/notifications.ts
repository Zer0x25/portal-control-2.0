export type NotificationType = "request" | "communication" | "alert";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  link: string;
  isRead: boolean; // For future use with persistent state
}
