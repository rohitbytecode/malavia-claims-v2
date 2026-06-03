import { Types } from "mongoose";
import { AppError } from "@/core/errors/AppError.js";
import { ClaimRepository } from "@/modules/claims/repository/claim.repository.js";
import { ClaimStatusHistoryRepository } from "@/modules/claims/repository/claim-status-history.repository.js";
import { validateClaimStatusTransition } from "@/modules/claims/workflow/claim-transition.map.js";
import {
  toClaimResponse,
  toClaimStatusHistoryResponse,
} from "@/modules/claims/mapper/claim.mapper.js";
import { ClaimStatus } from "@/modules/claims/constant/claim-status.enum.js";
import { ClaimType } from "@/modules/claims/constant/claim-type.enum.js";
import { DepositRepository } from "@/modules/deposits/repository/deposit.repository.js";
import { RefundStatus } from "@/modules/deposits/constant/refund-status.enum.js";
import { NotificationService } from "@/modules/notifications/service/notification.service.js";
import { AdvancedNotificationService } from "@/modules/advanced-notifications/service/advanced-notification.service.js";
import { UserModel } from "@/modules/users/schema/user.schema.js";
import { SettlementModel } from "@/modules/settlements/schema/settlement.schema.js";

interface CreateClaimPayload {
  type: ClaimType;
  insuranceCompanyId?: string;
  insurerId?: string;
  patientId: string | any;
  hospitalId?: string;
  departmentId?: string;
  doctorId?: string;
  totalClaimAmount: number;
  tdsAmount?: number;
  deductions?: number;
  hospitalDiscount?: number;
  depositAmount?: number;
  refundAmount?: number;
  remarks?: string;
  createdBy?: string;
}

export class ClaimService {
  private static buildClaimNumber(): string {
    return `CLM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }

  static async createClaim(payload: CreateClaimPayload) {
    const claim = await ClaimRepository.createClaim({
      claimNumber: this.buildClaimNumber(),
      type: payload.type,
      status: ClaimStatus.DRAFT,
      insuranceCompanyId:
        payload.insuranceCompanyId &&
        Types.ObjectId.isValid(payload.insuranceCompanyId)
          ? new Types.ObjectId(payload.insuranceCompanyId)
          : undefined,

      insurerId: payload.insurerId,

      patientId: payload.patientId,

      hospitalId:
        payload.hospitalId && Types.ObjectId.isValid(payload.hospitalId)
          ? new Types.ObjectId(payload.hospitalId)
          : undefined,

      departmentId:
        payload.departmentId && Types.ObjectId.isValid(payload.departmentId)
          ? new Types.ObjectId(payload.departmentId)
          : undefined,
      doctorId:
        payload.doctorId && Types.ObjectId.isValid(payload.doctorId)
          ? new Types.ObjectId(payload.doctorId)
          : undefined,
      totalClaimAmount: payload.totalClaimAmount,
      tdsAmount: payload.tdsAmount ?? 0,
      deductions: payload.deductions ?? 0,
      hospitalDiscount: payload.hospitalDiscount ?? 0,
      depositAmount: payload.depositAmount ?? 0,
      refundAmount: payload.refundAmount ?? 0,
      remarks: payload.remarks ? [payload.remarks] : [],
      createdBy:
        payload.createdBy && Types.ObjectId.isValid(payload.createdBy)
          ? new Types.ObjectId(payload.createdBy)
          : undefined,
    });

    return toClaimResponse(claim);
  }

  static async getClaimById(claimId: string) {
    const claim = await ClaimRepository.findClaimById(claimId);

    if (!claim) {
      throw new AppError("Claim not found", 404);
    }

    if (claim.status === ClaimStatus.SETTLED) {
      const settlement = await SettlementModel.findOne({ claimId: claim._id }).lean();
      if (settlement) {
        (claim as any).settledAmount = (settlement.netPayable || 0) + (settlement.tds || 0);
      }
    }

    return toClaimResponse(claim);
  }

  static async listClaims(
    type: ClaimType | undefined,
    status: ClaimStatus | undefined,
    page: number,
    limit: number
  ) {
    const filter: Record<string, unknown> = {};

    if (type) filter.type = type;
    if (status) filter.status = status;

    const [claims, total] = await Promise.all([
      ClaimRepository.findClaims(filter, page, limit),
      ClaimRepository.countClaims(filter),
    ]);

    // Attach settledAmount if status is SETTLED
    const settledClaimIds = claims
      .filter((c) => c.status === ClaimStatus.SETTLED)
      .map((c) => c._id);

    if (settledClaimIds.length > 0) {
      const settlements = await SettlementModel.find({
        claimId: { $in: settledClaimIds },
      }).lean();

      const settlementMap = new Map<string, number>();
      for (const s of settlements) {
        settlementMap.set(s.claimId.toString(), (s.netPayable || 0) + (s.tds || 0));
      }

      for (const claim of claims) {
        if (claim.status === ClaimStatus.SETTLED) {
          const settledAmt = settlementMap.get(claim._id.toString());
          if (settledAmt !== undefined) {
            (claim as any).settledAmount = settledAmt;
          }
        }
      }
    }

    return {
      items: claims.map(toClaimResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async transitionClaimStatus(
    claimId: string,
    toStatus: ClaimStatus,
    remarks?: string,
    performedBy?: string,
    claimNumber?: string,
    totalClaimAmount?: number,
    depositAmount?: number,
    refundAmount?: number
  ) {
    try {
      const claim = await ClaimRepository.findClaimById(claimId);

      if (!claim) {
        throw new AppError("Claim not found", 404);
      }

      validateClaimStatusTransition(claim.type, claim.status, toStatus);

      // Verify that reconsideration transitions match the original rejection stage
      if (claim.status === ClaimStatus.RECONSIDERATION_PENDING) {
        const histories =
          await ClaimStatusHistoryRepository.findByClaimId(claimId);
        const lastRejection = histories.find(
          (h) =>
            h.toStatus === ClaimStatus.PREAUTH_REJECTED ||
            h.toStatus === ClaimStatus.FINAL_REJECTED
        );

        if (lastRejection) {
          if (lastRejection.toStatus === ClaimStatus.PREAUTH_REJECTED) {
            if (
              toStatus !== ClaimStatus.PREAUTH_APPROVED &&
              toStatus !== ClaimStatus.PREAUTH_REJECTED
            ) {
              throw new AppError(
                "For pre-authorization reconsideration, the next status must be Pre-Auth Approved or Pre-Auth Rejected",
                400
              );
            }
          } else if (lastRejection.toStatus === ClaimStatus.FINAL_REJECTED) {
            if (
              toStatus !== ClaimStatus.FINAL_APPROVED &&
              toStatus !== ClaimStatus.FINAL_REJECTED
            ) {
              throw new AppError(
                "For final authorization reconsideration, the next status must be Final Approved or Final Rejected",
                400
              );
            }
          }
        }
      }

      // Enforce mandatory claim/AL number for pre-auth approval
      if (
        (claim.status === ClaimStatus.PREAUTH_PENDING ||
          claim.status === ClaimStatus.RECONSIDERATION_PENDING) &&
        toStatus === ClaimStatus.PREAUTH_APPROVED &&
        !claimNumber?.trim()
      ) {
        throw new AppError(
          "Insurance Claim / AL Number is required when approving pre-authorization",
          400
        );
      }

      // Enforce mandatory positive totalClaimAmount for DRAFT -> PREAUTH_PENDING
      if (
        claim.status === ClaimStatus.DRAFT &&
        toStatus === ClaimStatus.PREAUTH_PENDING
      ) {
        if (totalClaimAmount === undefined || totalClaimAmount <= 0) {
          throw new AppError(
            "Claim amount must be specified and greater than 0 when moving from Draft to Pre-Auth Pending",
            400
          );
        }
      }

      // Enforce 7-day limit for reconsideration
      if (toStatus === ClaimStatus.RECONSIDERATION_PENDING) {
        if (
          claim.status !== ClaimStatus.PREAUTH_REJECTED &&
          claim.status !== ClaimStatus.FINAL_REJECTED
        ) {
          throw new AppError(
            "Reconsideration can only be requested from Pre-Auth Rejected or Final Rejected states",
            400
          );
        }

        const histories =
          await ClaimStatusHistoryRepository.findByClaimId(claimId);
        const rejectionEntry = histories.find(
          (h: any) => h.toStatus === claim.status
        );
        const rejectionDate = rejectionEntry
          ? new Date(rejectionEntry.effectiveAt || rejectionEntry.createdAt)
          : new Date(claim.updatedAt);

        const diffMs = Date.now() - rejectionDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffDays > 7) {
          throw new AppError(
            "Reconsideration is only allowed within 7 days of rejection",
            400
          );
        }
      }

      // Only allow totalClaimAmount changes during permitted transitions
      const amountChangeAllowed =
        (claim.status === ClaimStatus.DRAFT &&
          toStatus === ClaimStatus.PREAUTH_PENDING) ||
        ((claim.status === ClaimStatus.PREAUTH_PENDING ||
          claim.status === ClaimStatus.RECONSIDERATION_PENDING) &&
          toStatus === ClaimStatus.PREAUTH_APPROVED) ||
        ((claim.status === ClaimStatus.FINAL_APPROVAL_PENDING ||
          claim.status === ClaimStatus.RECONSIDERATION_PENDING) &&
          toStatus === ClaimStatus.FINAL_APPROVED);

      if (totalClaimAmount !== undefined && !amountChangeAllowed) {
        throw new AppError(
          "Claim amount can only be changed during Draft to Pre-Auth Pending, Pre-Auth Approval, or Final Approval transitions",
          400
        );
      }

      const updatedClaim = await ClaimRepository.updateClaimStatus(
        claimId,
        toStatus,
        remarks,
        performedBy,
        claimNumber?.trim(),
        amountChangeAllowed ? totalClaimAmount : undefined,
        depositAmount,
        refundAmount
      );

      console.log(
        "DEBUG patientId:",
        JSON.stringify((updatedClaim as any).patientId)
      );

      if (!updatedClaim) {
        throw new AppError("Unable to update claim status", 500);
      }

      // Sync Deposit record when FINAL_APPROVED
      if (
        toStatus === ClaimStatus.FINAL_APPROVED &&
        depositAmount !== undefined
      ) {
        const existingDeposit =
          await DepositRepository.findDepositByClaimId(claimId);
        if (existingDeposit) {
          await DepositRepository.updateDeposit(
            existingDeposit._id.toString(),
            {
              collectedAmount: depositAmount,
            } as any
          );
        } else {
          await DepositRepository.createDeposit({
            claimId: new Types.ObjectId(claimId),
            collectedAmount: depositAmount,
            refundAmount: 0,
            refundStatus: RefundStatus.PENDING,
          } as any);
        }
      }

      // Sync Deposit record when DEPOSIT_RETURNED
      if (toStatus === ClaimStatus.DEPOSIT_RETURNED) {
        const deposit = await DepositRepository.findDepositByClaimId(claimId);
        if (deposit) {
          await DepositRepository.updateDeposit(deposit._id.toString(), {
            refundStatus: RefundStatus.COMPLETED,
            refundDate: new Date(),
          } as any);
        }
      }

      await ClaimStatusHistoryRepository.createClaimStatusHistory({
        claimId: claim._id.toString(),
        fromStatus: claim.status,
        toStatus,
        remarks,
        changedBy:
          performedBy && Types.ObjectId.isValid(performedBy)
            ? new Types.ObjectId(performedBy)
            : undefined,
        effectiveAt: new Date(),
      });

      let performedByName: string | undefined;
      const patientName =
        await import("@/modules/patients/schema/patient.schema.js")
          .then(({ PatientModel }) =>
            PatientModel.findOne(
              { patientId: (updatedClaim as any).patientId },
              { name: 1 }
            ).lean()
          )
          .then((p) => {
            console.log("DEBUG patient lookup result:", JSON.stringify(p));
            return p?.name;
          });
      const companyName = (updatedClaim as any).insuranceCompanyId?.name as
        | string
        | undefined;
      if (performedBy && Types.ObjectId.isValid(performedBy)) {
        const actor = await UserModel.findById(performedBy, {
          fullName: 1,
        }).lean();
        performedByName = actor?.fullName;
      }
      NotificationService.broadcastClaimStatusChange(
        claimId,
        updatedClaim.claimNumber,
        toStatus,
        performedByName
      );
      AdvancedNotificationService.sendClaimTransitionEmail({
        claimId,
        claimNumber: updatedClaim.claimNumber,
        toStatus,
        performedByName,
        remarks,
        patientName,
        companyName,
      });

      if (updatedClaim.status === ClaimStatus.SETTLED) {
        const settlement = await SettlementModel.findOne({ claimId: updatedClaim._id }).lean();
        if (settlement) {
          (updatedClaim as any).settledAmount = (settlement.netPayable || 0) + (settlement.tds || 0);
        }
      }

      return toClaimResponse(updatedClaim);
    } catch (error) {
      console.error("TRANSITION ERROR:", error);
      throw error;
    }
  }

  static async getStatusHistory(claimId: string) {
    const claim = await ClaimRepository.findClaimById(claimId);

    if (!claim) {
      throw new AppError("Claim not found", 404);
    }

    const history = await ClaimStatusHistoryRepository.findByClaimId(claimId);
    return history.map(toClaimStatusHistoryResponse);
  }

  static async updateBillBreakdown(
    claimId: string,
    billBreakdown: {
      departmentCategory: string;
      amount: number;
      description?: string;
    }[]
  ) {
    const claim = await ClaimRepository.findClaimById(claimId);
    if (!claim) {
      throw new AppError("Claim not found", 404);
    }

    const updatedClaim = await ClaimRepository.updateBillBreakdown(
      claimId,
      billBreakdown
    );

    if (!updatedClaim) {
      throw new AppError("Unable to update bill breakdown", 500);
    }

    if (updatedClaim.status === ClaimStatus.SETTLED) {
      const settlement = await SettlementModel.findOne({ claimId: updatedClaim._id }).lean();
      if (settlement) {
        (updatedClaim as any).settledAmount = (settlement.netPayable || 0) + (settlement.tds || 0);
      }
    }

    return toClaimResponse(updatedClaim);
  }
}
