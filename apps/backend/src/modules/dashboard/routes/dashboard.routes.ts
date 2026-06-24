import { Router } from "express";
import { DashboardController } from "../controller/dashboard.controller.js";
import { authenticate } from "@/modules/auth/middleware/auth.middleware.js";
import { requireTenant } from "@/middleware/tenant.middleware.js";

const router = Router();

router.get("/metrics", authenticate, requireTenant, DashboardController.getMetrics);

export default router;
