import { StateCreator } from "zustand";
import { AppState } from "../types";
import { NotificationItem } from "../../types/index";

export interface NotificationSlice {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoadingNotifications: boolean;
  loadNotifications: () => Promise<void>;
  markCommunicationsAsRead: () => Promise<void>;
}

export const createNotificationSlice: StateCreator<AppState, [], [], NotificationSlice> = (
  set,
  _get,
) => ({
  notifications: [],
  unreadCount: 0,
  isLoadingNotifications: false,

  loadNotifications: async () => {
    set({ isLoadingNotifications: true });
    // Note: Request notifications are now handled via pure queries in components
    // for better performance and alignment with TanStack Query.
    set({
      notifications: [],
      unreadCount: 0,
      isLoadingNotifications: false,
    });
  },

  markCommunicationsAsRead: async () => {
    set({ unreadCount: 0 });
  },
});
