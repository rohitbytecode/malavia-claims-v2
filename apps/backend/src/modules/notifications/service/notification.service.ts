import { NotificationRepository } from "../repository/notification.repository.js";
import { NotificationType } from "../types/notification.types.js";
import { AppError } from "@/core/errors/AppError.js";
import { UserModel } from "@/modules/users/schema/user.schema.js";
import { getIO } from "@/config/socket.js";
import { logger } from "@/config/logger.js";
import { Roles } from "@/core/enums/roles.enum.js";

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
      console.error(
        "[NotificationService] Failed to send notification:",
        error
      );
    }
  }

  static async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20
  ) {
    const notifications = await NotificationRepository.getUserNotifications(
      userId,
      page,
      limit
    );
    const unreadCount = await NotificationRepository.getUnreadCount(userId);

    return {
      notifications,
      unreadCount,
    };
  }

  static async markAsRead(notificationId: string, userId: string) {
    const notification = await NotificationRepository.markAsRead(
      notificationId,
      userId
    );
    if (!notification) {
      throw new AppError("Notification not found", 404);
    }
    return notification;
  }

  static async markAllAsRead(userId: string) {
    await NotificationRepository.markAllAsRead(userId);
  }

  /**
   * Broadcast a claim-status-change notification to pharmacists and push the
   * event over Socket.io so connected clients update in real time.
   */
  static async broadcastClaimStatusChange(
    claimId: string,
    claimNumber: string | undefined,
    toStatus: string,
    performedByName?: string
  ) {
    try {
      const displayClaim = claimNumber ?? claimId;
      const title = "Claim Status Updated";
      const message = performedByName
        ? `${performedByName} moved claim ${displayClaim} to ${toStatus}`
        : `Claim ${displayClaim} moved to ${toStatus}`;

      // 1. Persist pharmacist notifications so the bell/history stays accurate.
      const users = await UserModel.find(
        { isActive: true, role: Roles.PHARMACIST },
        { _id: 1 }
      ).lean();

      const docs = users.map((u) => ({
        userId: u._id.toString(),
        type: NotificationType.CLAIM_STATUS,
        title,
        message,
        entityId: claimId,
      }));

      if (docs.length) {
        await NotificationRepository.createManyNotifications(docs);
      }

      // 2. Push real-time event only to connected pharmacist browsers.
      const timestamp = new Date().toISOString();
      const payload = {
        claimId,
        entityId: claimId,
        claimNumber: claimNumber ?? null,
        toStatus,
        type: NotificationType.CLAIM_STATUS,
        performedByName: performedByName ?? null,
        title,
        message,
        timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const io = getIO();
      io.to(`role:${Roles.PHARMACIST}`).emit("notification:new", payload);
      io.to(`role:${Roles.PHARMACIST}`).emit("claim:status-changed", payload);

      logger.info(
        `Broadcasted claim status change: ${displayClaim} → ${toStatus} to ${docs.length} pharmacists`
      );
    } catch (err) {
      // Notification failures should never block the main flow
      logger.error(err, "Failed to broadcast claim status change notification");
    }
  }
}
