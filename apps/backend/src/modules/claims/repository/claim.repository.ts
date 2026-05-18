import { Types } from "mongoose";
import { ClaimModel } from "@/modules/claims/schema/claim.schema.js";
import { ClaimDocument } from "@/modules/claims/types/claim.types.js";
import { ClaimStatus } from "@/modules/claims/constant/claim-status.enum.js";

interface ClaimFilter {
  type?: string;
  status?: string;
}

export class ClaimRepository {
  static async createClaim(payload: Partial<ClaimDocument>) {
    return ClaimModel.create(payload);
  }

  static async findClaimById(claimId: string) {
    if (!Types.ObjectId.isValid(claimId)) {
      return null;
    }

    return ClaimModel.findById(claimId)
      .populate("patientId")
      .populate("insuranceCompanyId")
      .populate("departmentId")
      .populate("hospitalId")
      .populate("createdBy")
      .populate("updatedBy")
      .lean();
  }

  static async findClaims(filter: ClaimFilter, page: number, limit: number) {
    const query: Record<string, unknown> = {};

    if (filter.type) {
      query.type = filter.type;
    }

    if (filter.status) {
      query.status = filter.status;
    }

    return ClaimModel.find(query)
      .populate("patientId")
      .populate("insuranceCompanyId")
      .populate("departmentId")
      .populate("hospitalId")
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  static async countClaims(filter: ClaimFilter) {
    return ClaimModel.countDocuments(filter);
  }

  static async updateClaimStatus(
    claimId: string,
    status: ClaimStatus,
    remarks?: string,
    updatedBy?: string
  ) {
    const update: {
      status: ClaimStatus;
      updatedBy?: Types.ObjectId;
      $push?: { remarks: string };
    } = { status };

    if (updatedBy && Types.ObjectId.isValid(updatedBy)) {
      update.updatedBy = new Types.ObjectId(updatedBy);
    }

    if (remarks) {
      update.$push = { remarks };
    }

    return ClaimModel.findByIdAndUpdate(claimId, update, {
      new: true,
    });
  }
}
