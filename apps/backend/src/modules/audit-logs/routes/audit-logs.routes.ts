import { Router } from "express";
import { validate } from "@/middleware/zod.middleware.js";
import { AuditLogController } from "../controller/audit-log.controller.js";
import {
  getEntityLogsSchema,
  getModuleLogsSchema,
} from "../validation/audit-log.validation.js";
import { authenticate } from "@/modules/auth/middleware/auth.middleware.js";
import { allowRoles } from "@/middleware/permission.middleware.js";
import { Roles } from "@/core/enums/roles.enum.js";
import { getAllLogsSchema } from "../validation/audit-log.validation.js";

const router = Router();

router.get(
  "/entity/:entityId",
  validate(getEntityLogsSchema),
  AuditLogController.getEntityLogs
);

router.get(
  "/module/:module",
  validate(getModuleLogsSchema),
  AuditLogController.getModuleLogs
);

router.get(
  "/",
  authenticate,
  allowRoles(Roles.SUPER_ADMIN, Roles.ADMIN),
  validate(getAllLogsSchema),
  AuditLogController.getAllLogs
);

export default router;
