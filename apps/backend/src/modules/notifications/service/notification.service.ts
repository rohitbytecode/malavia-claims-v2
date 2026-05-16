import { NotificationRepository } from "../repository/notification.repository.js";
import { NotificationType } from "../types/notification.types.js";
import { AppError } from "@/core/errors/AppError.js";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityId?: string;
}

export class NotificationService {
  static async sendNotification(params: CreateNotificationParams) {
    try {
      await NotificationRepository.createNotification(params);
    } catch (error) {
      console.error("[NotificationService] Failed to send notification:", error);
    }
  }

  static async getUserNotifications(userId: string, page: number = 1, limit: number = 20) {
    const notifications = await NotificationRepository.getUserNotifications(userId, page, limit);
    const unreadCount = await NotificationRepository.getUnreadCount(userId);

    return {
      notifications,
      unreadCount,
    };
  }

  static async markAsRead(notificationId: string, userId: string) {
    const notification = await NotificationRepository.markAsRead(notificationId, userId);
    if (!notification) {
      throw new AppError("Notification not found", 404);
    }
    return notification;
  }

  static async markAllAsRead(userId: string) {
    await NotificationRepository.markAllAsRead(userId);
  }
}
