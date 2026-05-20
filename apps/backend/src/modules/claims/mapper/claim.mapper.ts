import {
  ClaimDocument,
  ClaimStatusHistoryDocument,
} from "@/modules/claims/types/claim.types.js";

export const toClaimResponse = (claim: any) => {
  const claimObject =
    typeof claim.toObject === "function" ? claim.toObject() : claim;

  return {
    id: claimObject._id.toString(),

    claimNumber: claimObject.claimNumber,

    type: claimObject.type,

    status: claimObject.status,

    insuranceCompany: mapRelation(claimObject.insuranceCompanyId),

    insurerId: claimObject.insurerId,

    patientId: claimObject.patientId,

    hospital: mapRelation(claimObject.hospitalId),

    department: mapRelation(claimObject.departmentId),

    totalClaimAmount: claimObject.totalClaimAmount,

    tdsAmount: claimObject.tdsAmount,

    deductions: claimObject.deductions,

    hospitalDiscount: claimObject.hospitalDiscount,

    depositAmount: claimObject.depositAmount,

    refundAmount: claimObject.refundAmount,

    remarks: claimObject.remarks,

    createdBy: mapRelation(claimObject.createdBy),

    updatedBy: mapRelation(claimObject.updatedBy),

    createdAt: claimObject.createdAt,

    updatedAt: claimObject.updatedAt,
  };
};

export const toClaimStatusHistoryResponse = (
  entry: ClaimStatusHistoryDocument
) => {
  const historyObject = entry.toObject();

  return {
    id: historyObject._id.toString(),
    claimId: historyObject.claimId.toString(),
    fromStatus: historyObject.fromStatus,
    toStatus: historyObject.toStatus,
    remarks: historyObject.remarks,
    changedBy: historyObject.changedBy?.toString() ?? null,
    effectiveAt: historyObject.effectiveAt,
    createdAt: historyObject.createdAt,
    updatedAt: historyObject.updatedAt,
  };
};

export const mapRelation = (value: any) => {
  if (!value) return null;

  if (typeof value === "string") {
    return value;
  }

  if (value._id) {
    return {
      id: value._id.toString(),
      ...value,
    };
  }

  return value.toString();
};
