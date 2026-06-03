import { ClaimModel } from "@/modules/claims/schema/claim.schema.js";
import { ClaimStatus } from "@/modules/claims/constant/claim-status.enum.js";
import { AlertModel } from "@/modules/alerts/schema/alert.schema.js";
import { SettlementModel } from "@/modules/settlements/schema/settlement.schema.js";
import { DepositModel } from "@/modules/deposits/schema/deposit.schema.js";
import { RefundStatus } from "@/modules/deposits/constant/refund-status.enum.js";
import { ClaimStatusHistoryModel } from "@/modules/claims/schema/claim-status-history.schema.js";

export class DashboardService {
  static async getDashboardMetrics() {
    // 1. Pending Counts
    const pendingPreauthCount = await ClaimModel.countDocuments({
      status: ClaimStatus.PREAUTH_PENDING,
    });

    const pendingFinalApprovalCount = await ClaimModel.countDocuments({
      status: ClaimStatus.FINAL_APPROVAL_PENDING,
    });

    const pendingSettlements = await ClaimModel.countDocuments({
      status: ClaimStatus.SETTLEMENT_PENDING,
    });

    // 2. Delayed Courier Claims
    const now = new Date();
    let delayedCourier45Days = 0;
    let delayedCourier60Days = 0;

    const settlementPendingClaims = await ClaimModel.find({
      status: ClaimStatus.SETTLEMENT_PENDING,
    }).lean();

    for (const claim of settlementPendingClaims) {
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

      if (diffDays >= 60) {
        delayedCourier60Days++;
      } else if (diffDays >= 45) {
        delayedCourier45Days++;
      }
    }

    // 3. Pending Deposit Refunds
    const pendingDepositRefunds = await DepositModel.countDocuments({
      refundStatus: RefundStatus.PENDING,
    });

    // 4. Active Alerts
    const activeAlertsCount = await AlertModel.countDocuments({
      resolved: false,
    });

    // 5. Total Settled Amount
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1, 0, 0, 0, 0);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    const totalSettledResult = await SettlementModel.aggregate([
      { $match: { settlementDate: { $gte: startOfYear, $lte: endOfYear } } },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $add: [
                { $ifNull: ["$netPayable", 0] },
                { $ifNull: ["$tds", 0] },
              ],
            },
          },
        },
      },
    ]);
    const totalSettledAmount =
      totalSettledResult.length > 0 ? totalSettledResult[0].total : 0;

    // Pharmacy settled amount
    const pharmacySettledResult = await SettlementModel.aggregate([
      { $match: { settlementDate: { $gte: startOfYear, $lte: endOfYear } } },
      { $unwind: "$departmentBreakdown" },
      { $match: { "departmentBreakdown.departmentCategory": "PHARMACY" } },
      {
        $group: {
          _id: null,
          total: { $sum: "$departmentBreakdown.netAmount" },
        },
      },
    ]);
    const pharmacySettledAmount =
      pharmacySettledResult.length > 0 ? pharmacySettledResult[0].total : 0;

    // 6. Claims by Status
    const claimsByStatus = await ClaimModel.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // 7. Claims Ageing Summary
    const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const days60Ago = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const days90Ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const ageingSummary = {
      under30Days: await ClaimModel.countDocuments({
        createdAt: { $gt: days30Ago },
      }),
      between30And60Days: await ClaimModel.countDocuments({
        createdAt: { $lte: days30Ago, $gt: days60Ago },
      }),
      between60And90Days: await ClaimModel.countDocuments({
        createdAt: { $lte: days60Ago, $gt: days90Ago },
      }),
      over90Days: await ClaimModel.countDocuments({
        createdAt: { $lte: days90Ago },
      }),
    };

    return {
      pendingCounts: {
        preauth: pendingPreauthCount,
        finalApproval: pendingFinalApprovalCount,
        settlements: pendingSettlements,
      },
      delayedClaims: {
        over45Days: delayedCourier45Days,
        over60Days: delayedCourier60Days,
      },
      pendingDepositRefunds,
      activeAlertsCount,
      financials: {
        totalSettledAmount,
        pharmacySettledAmount,
        year: currentYear,
      },
      claimsByStatus: claimsByStatus.map((s) => ({
        status: s._id,
        count: s.count,
      })),
      ageingSummary,
    };
  }
}
