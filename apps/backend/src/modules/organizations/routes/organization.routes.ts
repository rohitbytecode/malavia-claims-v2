import { Router } from "express";
import { validate } from "@/middleware/zod.middleware.js";
import { asyncHandler } from "@/shared/utils/asyncHandler.js";
import { OrganizationController } from "@/modules/organizations/controller/organization.controller.js";
import {
  registerOrganizationSchema,
  updateOrganizationSchema,
} from "@/modules/organizations/validation/organization.validation.js";
import { authenticate } from "@/modules/auth/middleware/auth.middleware.js";
import { allowRoles } from "@/middleware/permission.middleware.js";
import { Roles } from "@/core/enums/roles.enum.js";

const router = Router();

// Public — organization sign-up
router.post(
  "/register",
  validate(registerOrganizationSchema),
  asyncHandler(OrganizationController.register)
);

// Authenticated — own org
router.get("/me", authenticate, asyncHandler(OrganizationController.getOwn));

router.patch(
  "/me",
  authenticate,
  allowRoles(Roles.SUPER_ADMIN),
  validate(updateOrganizationSchema),
  asyncHandler(OrganizationController.updateOwn)
);

// Platform admin only — list all orgs
router.get(
  "/",
  authenticate,
  allowRoles(Roles.PLATFORM_ADMIN),
  asyncHandler(OrganizationController.listAll)
);

export default router;
