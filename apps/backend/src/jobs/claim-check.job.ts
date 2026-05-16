import { ClaimModel } from "@/modules/claims/schema/claim.schema.js";
import { ClaimStatus } from "@/modules/claims/constant/claim-status.enum.js";
import { AlertService } from "@/modules/alerts/service/alert.service.js";
import { AlertType } from "@/modules/alerts/constant/alert-type.enum.js";
import { AlertSeverity } from "@/modules/alerts/constant/alert-severity.enum.js";
import { DepositModel } from "@/modules/deposits/schema/deposit.schema.js";
import { RefundStatus } from "@/modules/deposits/constant/refund-status.enum.js";
import { logger } from "@/config/logger.js";

export const checkCourierDelays = async () => {
  const now = new Date();
  const days45Ago = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
  const days60Ago = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Over 60 days
  const criticalClaims = await ClaimModel.find({
    createdAt: { $lte: days60Ago },
    status: { $ne: ClaimStatus.SETTLED },
  }).lean();

  for (const claim of criticalClaims) {
    await AlertService.createAlert({
      claimId: claim._id.toString(),
      type: AlertType.COURIER_DELAY,
      severity: AlertSeverity.CRITICAL,
      message: `Claim ${claim.claimNumber} is severely delayed (>60 days)`,
    });
  }

  // Between 45 and 60 days
  const highClaims = await ClaimModel.find({
    createdAt: { $lte: days45Ago, $gt: days60Ago },
    status: { $ne: ClaimStatus.SETTLED },
  }).lean();

  for (const claim of highClaims) {
    await AlertService.createAlert({
      claimId: claim._id.toString(),
      type: AlertType.COURIER_DELAY,
      severity: AlertSeverity.HIGH,
      message: `Claim ${claim.claimNumber} is delayed (>45 days)`,
    });
  }
};

export const checkPendingSettlements = async () => {
  const pendingClaims = await ClaimModel.find({
    status: ClaimStatus.SETTLEMENT_PENDING,
  }).lean();

  for (const claim of pendingClaims) {
    await AlertService.createAlert({
      claimId: claim._id.toString(),
      type: AlertType.SETTLEMENT_PENDING,
      severity: AlertSeverity.MEDIUM,
      message: `Claim ${claim.claimNumber} is pending settlement`,
    });
  }
};

export const checkPendingRefunds = async () => {
  const pendingDeposits = await DepositModel.find({
    refundStatus: RefundStatus.PENDING,
  }).populate("claimId").lean();

  for (const deposit of pendingDeposits) {
    if (deposit.claimId) {
      await AlertService.createAlert({
        claimId: (deposit.claimId as any)._id.toString(),
        type: AlertType.DEPOSIT_MISMATCH, // Repurposing or could create REFUND_PENDING type
        severity: AlertSeverity.MEDIUM,
        message: `Refund pending for collected amount ${deposit.collectedAmount}`,
      });
    }
  }
};
