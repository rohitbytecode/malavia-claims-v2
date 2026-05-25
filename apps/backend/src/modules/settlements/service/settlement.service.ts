import { Types } from "mongoose";
import { SettlementRepository } from "../repository/settlement.repository.js";
import { SettlementMethod } from "../constant/settlement-method.enum.js";
import { AuditLogService } from "@/modules/audit-logs/service/audit-log.service.js";
import { AuditModule } from "@/modules/audit-logs/constant/audit-module.enum.js";
import { AuditAction } from "@/modules/audit-logs/constant/audit-action.enum.js";
import { AppError } from "@/core/errors/AppError.js";
import { ClaimRepository } from "@/modules/claims/repository/claim.repository.js";
import { ClaimService } from "@/modules/claims/service/claim.service.js";
import { ClaimStatus } from "@/modules/claims/constant/claim-status.enum.js";
import { DepositRepository } from "@/modules/deposits/repository/deposit.repository.js";
import { RefundStatus } from "@/modules/deposits/constant/refund-status.enum.js";

interface CreateSettlementParams {
  claimId: string;
  approvedAmount: number;
  hospitalDiscount?: number;
  deductions?: number;
  tds?: number;
  settlementMethod: SettlementMethod;
  remarks?: string;
  settledBy: string;
  refundAmount?: number;
}

export class SettlementService {
  static async createSettlement(params: CreateSettlementParams) {
    const claim = await ClaimRepository.findClaimById(params.claimId);
    if (!claim) {
      throw new AppError("Claim not found", 404);
    }
    if (claim.status !== ClaimStatus.SETTLEMENT_PENDING) {
      throw new AppError(
        "Settlement can only be created for claims in SETTLEMENT_PENDING status",
        400
      );
    }

    const existing = await SettlementRepository.findSettlementByClaimId(
      params.claimId
    );
    if (existing) {
      throw new AppError("Settlement already exists for this claim", 400);
    }

    // Server-side safe calculation of netPayable
    const hospitalDiscount = params.hospitalDiscount ?? 0;
    const deductions = params.deductions ?? 0;
    const tds = params.tds ?? 0;

    const netPayable =
      params.approvedAmount - hospitalDiscount - deductions - tds;

    if (netPayable < 0) {
      throw new AppError("Net payable amount cannot be negative", 400);
    }

    const settlementPayload = {
      claimId: new Types.ObjectId(params.claimId),
      approvedAmount: params.approvedAmount,
      hospitalDiscount,
      deductions,
      tds,
      netPayable,
      settlementMethod: params.settlementMethod,
      remarks: params.remarks ? [params.remarks] : [],
      settledBy: new Types.ObjectId(params.settledBy),
    };

    const settlement = await SettlementRepository.createSettlement(
      settlementPayload as any
    );

    await AuditLogService.logAction({
      module: AuditModule.SETTLEMENTS,
      entityId: settlement._id.toString(),
      action: AuditAction.CREATE,
      performedBy: params.settledBy,
      newData: settlement.toObject(),
    });

    // Auto-transition claim status to SETTLED
    await ClaimService.transitionClaimStatus(
      params.claimId,
      ClaimStatus.SETTLED,
      "Settlement finalized and recorded in finance module",
      params.settledBy,
      undefined, // claimNumber
      undefined, // totalClaimAmount
      undefined, // depositAmount
      params.refundAmount // refundAmount
    );

    // Sync or create Deposit record with the refundAmount
    const existingDeposit = await DepositRepository.findDepositByClaimId(
      params.claimId
    );
    if (existingDeposit) {
      await DepositRepository.updateDeposit(existingDeposit._id.toString(), {
        refundAmount: params.refundAmount ?? 0,
        refundStatus: RefundStatus.PENDING,
      } as any);
    } else {
      await DepositRepository.createDeposit({
        claimId: new Types.ObjectId(params.claimId),
        collectedAmount: claim.depositAmount ?? 0,
        refundAmount: params.refundAmount ?? 0,
        refundStatus: RefundStatus.PENDING,
      } as any);
    }

    return settlement;
  }

  static async getSettlementByClaimId(claimId: string) {
    const settlement =
      await SettlementRepository.findSettlementByClaimId(claimId);
    if (!settlement) {
      throw new AppError("Settlement not found for this claim", 404);
    }
    return settlement;
  }
}
