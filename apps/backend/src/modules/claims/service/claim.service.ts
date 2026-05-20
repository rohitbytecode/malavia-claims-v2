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

interface CreateClaimPayload {
  type: ClaimType;
  insuranceCompanyId?: string;
  insurerId?: string;
  patientId: string | any;
  hospitalId?: string;
  departmentId?: string;
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
    performedBy?: string
  ) {
    try {
      const claim = await ClaimRepository.findClaimById(claimId);

      if (!claim) {
        throw new AppError("Claim not found", 404);
      }

      validateClaimStatusTransition(claim.type, claim.status, toStatus);

      const updatedClaim = await ClaimRepository.updateClaimStatus(
        claimId,
        toStatus,
        remarks,
        performedBy
      );

      if (!updatedClaim) {
        throw new AppError("Unable to update claim status", 500);
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
}
