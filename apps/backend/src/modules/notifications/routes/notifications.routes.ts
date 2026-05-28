import { Router } from "express";
import { NotificationController } from "../controller/notification.controller.js";
import { authenticate } from "@/modules/auth/middleware/auth.middleware.js";

const router = Router();

router.get("/", authenticate, NotificationController.getUserNotifications);
router.patch(
  "/:notificationId/read",
  authenticate,
  NotificationController.markAsRead
);
router.patch("/read-all", authenticate, NotificationController.markAllAsRead);

export default router;
