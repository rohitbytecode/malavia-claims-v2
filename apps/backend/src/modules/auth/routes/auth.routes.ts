import { Router } from "express";
import { validate } from "@/middleware/zod.middleware.js";
import { asyncHandler } from "@/shared/utils/asyncHandler.js";
import { AuthController } from "@/modules/auth/controller/auth.controller.js";
import {
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from "@/modules/auth/validation/auth.validation.js";
import { authenticate } from "@/modules/auth/middleware/auth.middleware.js";

const router = Router();

router.get("/users", asyncHandler(AuthController.getPublicUsers));
router.post(
  "/login",
  validate(loginSchema),
  asyncHandler(AuthController.login)
);
router.post(
  "/refresh",
  validate(refreshTokenSchema),
  asyncHandler(AuthController.refreshToken)
);
router.post(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(AuthController.changePassword)
);

export default router;
