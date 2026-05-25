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
import { DepartmentCategory } from "@/modules/payer-contracts/constant/department-category.enum.js";

interface DepartmentBreakdownItem {
  departmentCategory: DepartmentCategory;
  claimedAmount: number;
  approvedAmount: number;
  deduction: number;
  discountPercent: number;
  discountAmount: number;
  netAmount: number;
  remarks?: string;
}

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
  departmentBreakdown?: DepartmentBreakdownItem[];
  payerContractId?: string;
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
    const refundAmount = params.refundAmount ?? 0;
    const depositAmount = claim.depositAmount ?? 0;
    const extraRefund = Math.max(0, refundAmount - depositAmount);

    const netPayable = Math.max(
      0,
      params.approvedAmount - hospitalDiscount - tds - extraRefund
    );

    // Process department breakdown if provided
    const departmentBreakdown = (params.departmentBreakdown ?? []).map(
      (item) => ({
        departmentCategory: item.departmentCategory,
        claimedAmount: item.claimedAmount,
        approvedAmount: item.approvedAmount,
        deduction:
          item.deduction ??
          Math.max(0, item.claimedAmount - item.approvedAmount),
        discountPercent: item.discountPercent ?? 0,
        discountAmount: item.discountAmount ?? 0,
        netAmount:
          item.netAmount ??
          Math.max(0, item.approvedAmount - (item.discountAmount ?? 0)),
        remarks: item.remarks ?? "",
      })
    );

    const settlementPayload = {
      claimId: new Types.ObjectId(params.claimId),
      approvedAmount: params.approvedAmount,
      hospitalDiscount,
      deductions,
      tds,
      netPayable,
      departmentBreakdown,
      payerContractId: params.payerContractId
        ? new Types.ObjectId(params.payerContractId)
        : undefined,
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
