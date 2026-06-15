import { ClaimModel } from "@/modules/claims/schema/claim.schema.js";
import { ClaimStatusHistoryModel } from "@/modules/claims/schema/claim-status-history.schema.js";
import { ClaimStatus } from "@/modules/claims/constant/claim-status.enum.js";
import { AlertService } from "@/modules/alerts/service/alert.service.js";
import { AlertType } from "@/modules/alerts/constant/alert-type.enum.js";
import { AlertSeverity } from "@/modules/alerts/constant/alert-severity.enum.js";
import { DepositModel } from "@/modules/deposits/schema/deposit.schema.js";
import { RefundStatus } from "@/modules/deposits/constant/refund-status.enum.js";
import { AlertModel } from "@/modules/alerts/schema/alert.schema.js";
import { logger } from "@/config/logger.js";

export const checkCourierDelays = async () => {
  const now = new Date();

  // Find all claims currently in SETTLEMENT_PENDING stage
  const pendingClaims = await ClaimModel.find({
    status: ClaimStatus.SETTLEMENT_PENDING,
  }).lean();

  const pendingClaimIds = pendingClaims.map((c) => c._id);

  // Resolve any active COURIER_DELAY alerts for claims that are no longer in SETTLEMENT_PENDING
  await AlertModel.updateMany(
    {
      type: AlertType.COURIER_DELAY,
      resolved: false,
      claimId: { $nin: pendingClaimIds },
    },
    {
      $set: {
        resolved: true,
        resolvedAt: now,
        message:
          "Resolved automatically: Claim is no longer in Settlement Pending.",
      },
    }
  );

  for (const claim of pendingClaims) {
    // Find when the claim transitioned to SETTLEMENT_PENDING
    const history = await ClaimStatusHistoryModel.findOne({
      claimId: claim._id,
      toStatus: ClaimStatus.SETTLEMENT_PENDING,
    })
      .sort({ effectiveAt: -1 })
      .lean();

    const transitionDate = history
      ? new Date(history.effectiveAt || history.createdAt)
      : new Date(claim.createdAt);

    const diffMs = now.getTime() - transitionDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    let severity: AlertSeverity | null = null;
    let message = "";

    if (diffDays >= 90) {
      severity = AlertSeverity.CRITICAL;
      message = `Claim ${claim.claimNumber} is critically delayed (>90 days in Settlement Pending)`;
    } else if (diffDays >= 60) {
      severity = AlertSeverity.MEDIUM;
      message = `Claim ${claim.claimNumber} is severely delayed (>60 days in Settlement Pending)`;
    } else if (diffDays >= 30) {
      severity = AlertSeverity.LOW;
      message = `Claim ${claim.claimNumber} is delayed (>30 days in Settlement Pending)`;
    }

    if (severity) {
      // Check if there is already an active COURIER_DELAY alert for this claim
      const existingAlert = await AlertModel.findOne({
        claimId: claim._id,
        type: AlertType.COURIER_DELAY,
        resolved: false,
      });

      if (existingAlert) {
        // If it exists, update severity and message if they changed
        if (
          existingAlert.severity !== severity ||
          existingAlert.message !== message
        ) {
          existingAlert.severity = severity;
          existingAlert.message = message;
          await existingAlert.save();
        }
      } else {
        // Create a new alert
        await AlertService.createAlert({
          claimId: claim._id.toString(),
          type: AlertType.COURIER_DELAY,
          severity,
          message,
        });
      }
    } else {
      // If delay is less than 30 days, resolve any active COURIER_DELAY alert that might exist
      await AlertModel.updateMany(
        {
          claimId: claim._id,
          type: AlertType.COURIER_DELAY,
          resolved: false,
        },
        {
          $set: {
            resolved: true,
            resolvedAt: now,
            message: "Resolved automatically: Claim delay is under 30 days.",
          },
        }
      );
    }
  }
};

export const checkPendingSettlements = async () => {
  const now = new Date();
  const pendingClaims = await ClaimModel.find({
    status: ClaimStatus.SETTLEMENT_PENDING,
  }).lean();

  const pendingClaimIds = pendingClaims.map((c) => c._id);
  const activeClaimsToAlertIds: any[] = [];
  const activeClaimsNotToAlertIds: any[] = [];

  for (const claim of pendingClaims) {
    // Find when the claim transitioned to SETTLEMENT_PENDING
    const history = await ClaimStatusHistoryModel.findOne({
      claimId: claim._id,
      toStatus: ClaimStatus.SETTLEMENT_PENDING,
    })
      .sort({ effectiveAt: -1 })
      .lean();

    const transitionDate = history
      ? new Date(history.effectiveAt || history.createdAt)
      : new Date(claim.createdAt);

    const diffMs = now.getTime() - transitionDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays >= 30) {
      activeClaimsToAlertIds.push(claim._id);
    } else {
      activeClaimsNotToAlertIds.push(claim._id);
    }
  }

  // Resolve any active SETTLEMENT_PENDING alerts for claims:
  // - That are no longer in SETTLEMENT_PENDING stage
  // - Or that have less than 30 days ageing in SETTLEMENT_PENDING
  await AlertModel.updateMany(
    {
      type: AlertType.SETTLEMENT_PENDING,
      resolved: false,
      $or: [
        { claimId: { $nin: pendingClaimIds } },
        { claimId: { $in: activeClaimsNotToAlertIds } },
      ],
    },
    {
      $set: {
        resolved: true,
        resolvedAt: now,
        message:
          "Resolved automatically: Claim is no longer pending settlement or ageing is less than 30 days.",
      },
    }
  );

  for (const claimId of activeClaimsToAlertIds) {
    const claim = pendingClaims.find(
      (c) => c._id.toString() === claimId.toString()
    )!;

    // Check if an active SETTLEMENT_PENDING alert already exists
    const existingAlert = await AlertModel.findOne({
      claimId: claim._id,
      type: AlertType.SETTLEMENT_PENDING,
      resolved: false,
    });

    if (!existingAlert) {
      await AlertService.createAlert({
        claimId: claim._id.toString(),
        type: AlertType.SETTLEMENT_PENDING,
        severity: AlertSeverity.MEDIUM,
        message: `Claim ${claim.claimNumber} is pending settlement`,
      });
    }
  }
};

export const checkPendingRefunds = async () => {
  const now = new Date();
  const pendingDeposits = await DepositModel.find({
    refundStatus: RefundStatus.PENDING,
  })
    .populate("claimId")
    .lean();

  const activeClaimIds = pendingDeposits
    .filter((d) => d.claimId)
    .map((d) => (d.claimId as any)._id);

  // Resolve any active DEPOSIT_MISMATCH alerts for claims that no longer have pending refunds
  await AlertModel.updateMany(
    {
      type: AlertType.DEPOSIT_MISMATCH,
      resolved: false,
      claimId: { $nin: activeClaimIds },
    },
    {
      $set: {
        resolved: true,
        resolvedAt: now,
        message: "Resolved automatically: Refund is no longer pending.",
      },
    }
  );

  for (const deposit of pendingDeposits) {
    if (deposit.claimId) {
      const claimIdStr = (deposit.claimId as any)._id.toString();

      // Check if an active DEPOSIT_MISMATCH alert already exists
      const existingAlert = await AlertModel.findOne({
        claimId: (deposit.claimId as any)._id,
        type: AlertType.DEPOSIT_MISMATCH,
        resolved: false,
      });

      if (!existingAlert) {
        await AlertService.createAlert({
          claimId: claimIdStr,
          type: AlertType.DEPOSIT_MISMATCH,
          severity: AlertSeverity.MEDIUM,
          message: `Refund pending for collected amount ${deposit.collectedAmount}`,
        });
      }
    }
  }
};
