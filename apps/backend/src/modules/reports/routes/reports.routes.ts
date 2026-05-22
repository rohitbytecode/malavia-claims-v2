import { Router } from "express";
import { ReportController } from "../controller/report.controller.js";

const router = Router();

router.get(
  "/patient-claims/:patientId",
  ReportController.getPatientClaimSummary
);
router.get("/insurance-performance", ReportController.getInsurancePerformance);
router.get("/monthly", ReportController.getMonthlyReport);
router.get("/settlement-report", ReportController.getSettlementReport);

export default router;
