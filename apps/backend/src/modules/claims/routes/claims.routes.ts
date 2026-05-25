import { Router } from "express";
import { validate } from "@/middleware/zod.middleware.js";
import { ClaimController } from "@/modules/claims/controller/claim.controller.js";
import {
  createClaimSchema,
  getClaimParamsSchema,
  listClaimsSchema,
  transitionClaimStatusSchema,
  updateBillBreakdownSchema,
} from "@/modules/claims/validation/claim.validation.js";

const router = Router();

router.post("/", validate(createClaimSchema), ClaimController.createClaim);
router.get("/", validate(listClaimsSchema), ClaimController.listClaims);
router.get(
  "/:claimId",
  validate(getClaimParamsSchema),
  ClaimController.getClaimById
);
router.post(
  "/:claimId/status-transition",
  validate(transitionClaimStatusSchema),
  ClaimController.transitionClaimStatus
);
router.get(
  "/:claimId/history",
  validate(getClaimParamsSchema),
  ClaimController.getClaimHistory
);
router.patch(
  "/:claimId/bill-breakdown",
  validate(updateBillBreakdownSchema),
  ClaimController.updateBillBreakdown
);

export default router;

