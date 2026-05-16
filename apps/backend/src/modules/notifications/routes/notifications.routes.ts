import { Router } from "express";
import { NotificationController } from "../controller/notification.controller.js";

const router = Router();

// Assuming authMiddleware is applied at app.ts level or here
router.get("/", NotificationController.getUserNotifications);
router.patch("/:notificationId/read", NotificationController.markAsRead);
router.patch("/read-all", NotificationController.markAllAsRead);

export default router;
