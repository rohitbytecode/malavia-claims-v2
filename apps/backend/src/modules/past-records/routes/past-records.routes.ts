import { Router } from "express";
import { allowRoles } from "@/middleware/permission.middleware.js";
import { Roles } from "@/core/enums/roles.enum.js";
import { authenticate } from "@/modules/auth/middleware/auth.middleware.js";
import { PastRecordsController } from "@/modules/past-records/controller/past-records.controller.js";

const router = Router();

// POST /api/v1/past-records  – Super Admin only
router.post(
  "/",
  authenticate,
  allowRoles(Roles.SUPER_ADMIN),
  PastRecordsController.importRecord
);

export default router;
