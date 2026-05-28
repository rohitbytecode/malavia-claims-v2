import { create } from "zustand";
import type { Notification } from "../types/domain";

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  toasts: Notification[];
  setNotifications: (notifications: Notification[]) => void;
  prependNotification: (notification: Notification) => void;
  markRead: (notificationId: string) => void;
  markAllRead: () => void;
  enqueueToast: (notification: Notification) => void;
  dismissToast: (notificationId: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  toasts: [],
  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((item) => !item.isRead).length,
    }),
  prependNotification: (notification) =>
    set((state) => {
      if (state.notifications.some((item) => item._id === notification._id)) {
        return state;
      }

      return {
        notifications: [notification, ...state.notifications],
        unreadCount: notification.isRead
          ? state.unreadCount
          : state.unreadCount + 1,
      };
    }),
  markRead: (notificationId) =>
    set((state) => {
      const notifications = state.notifications.map((item) =>
        item._id === notificationId
          ? { ...item, isRead: true, readAt: new Date().toISOString() }
          : item
      );
      return {
        notifications,
        unreadCount: notifications.filter((item) => !item.isRead).length,
      };
    }),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((item) => ({
        ...item,
        isRead: true,
        readAt: item.readAt ?? new Date().toISOString(),
      })),
      unreadCount: 0,
    })),
  enqueueToast: (notification) =>
    set((state) => ({
      toasts: state.toasts.some((item) => item._id === notification._id)
        ? state.toasts
        : [notification, ...state.toasts],
    })),
  dismissToast: (notificationId) =>
    set((state) => ({
      toasts: state.toasts.filter((item) => item._id !== notificationId),
    })),
}));
