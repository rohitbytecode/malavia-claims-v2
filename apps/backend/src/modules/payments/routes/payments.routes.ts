import { Router } from "express";
import { PaymentsController } from "../controller/payments.controller.js";
import { authenticate } from "@/modules/auth/middleware/auth.middleware.js";

const router = Router();

router.post(
  "/subscription/create",
  authenticate,
  PaymentsController.createSubscription
);

router.get(
  "/subscription/status",
  authenticate,
  PaymentsController.getSubscriptionStatus
);

router.post(
  "/subscription/verify",
  authenticate,
  PaymentsController.verifySubscription
);

router.post("/webhook", PaymentsController.handleWebhook);

export default router;
