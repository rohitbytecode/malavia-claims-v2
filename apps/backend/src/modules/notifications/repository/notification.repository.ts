import { Types } from "mongoose";
import { NotificationModel } from "../schema/notification.schema.js";

interface CreateNotificationPayload {
  userId: string | Types.ObjectId;
  type: string;
  title: string;
  message: string;
  entityId?: string | Types.ObjectId;
}

export class NotificationRepository {
  static async createNotification(payload: CreateNotificationPayload) {
    return NotificationModel.create({
      ...payload,
      userId: new Types.ObjectId(payload.userId),
      entityId: payload.entityId ? new Types.ObjectId(payload.entityId) : undefined,
    });
  }

  static async getUserNotifications(userId: string, page: number, limit: number) {
    return NotificationModel.find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  static async getUnreadCount(userId: string) {
    return NotificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      isRead: false,
    });
  }

  static async markAsRead(notificationId: string, userId: string) {
    return NotificationModel.findOneAndUpdate(
      { _id: new Types.ObjectId(notificationId), userId: new Types.ObjectId(userId) },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
  }

  static async markAllAsRead(userId: string) {
    return NotificationModel.updateMany(
      { userId: new Types.ObjectId(userId), isRead: false },
      { isRead: true, readAt: new Date() }
    );
  }
}
