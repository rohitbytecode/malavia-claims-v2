import { Router } from "express";
import { ReportController } from "../controller/report.controller.js";
import { authenticate } from "@/modules/auth/middleware/auth.middleware.js";
import { requireTenant } from "@/middleware/tenant.middleware.js";

const router = Router();

router.get(
  "/patient-claims/:patientId",
  authenticate,
  requireTenant,
  ReportController.getPatientClaimSummary
);
router.get(
  "/insurance-performance",
  authenticate,
  requireTenant,
  ReportController.getInsurancePerformance
);
router.get(
  "/monthly",
  authenticate,
  requireTenant,
  ReportController.getMonthlyReport
);
router.get(
  "/settlement-report",
  authenticate,
  requireTenant,
  ReportController.getSettlementReport
);
router.get(
  "/hospital-share-report",
  authenticate,
  requireTenant,
  ReportController.getHospitalShareReport
);

export default router;
