import { Request, Response } from "express";
import { NotificationService } from "../service/notification.service.js";

export class NotificationController {
  static async getUserNotifications(req: Request, res: Response) {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const data = await NotificationService.getUserNotifications(
      userId,
      page,
      limit
    );

    return res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",
      data,
    });
  }

  static async markAsRead(req: Request, res: Response) {
    const userId = (req as any).user?.userId;
    const { notificationId } = req.params;

    const notification = await NotificationService.markAsRead(
      notificationId as string,
      userId
    );

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  }

  static async markAllAsRead(req: Request, res: Response) {
    const userId = (req as any).user?.userId;

    await NotificationService.markAllAsRead(userId);

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  }
}
