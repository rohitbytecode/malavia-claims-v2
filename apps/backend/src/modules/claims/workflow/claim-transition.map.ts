import { AppError } from "@/core/errors/AppError.js";
import { ClaimStatus } from "@/modules/claims/constant/claim-status.enum.js";
import { ClaimType } from "@/modules/claims/constant/claim-type.enum.js";

type ClaimWorkflowMap = Partial<Record<ClaimStatus, ClaimStatus[]>>;

const cashlessWorkflow: ClaimWorkflowMap = {
  [ClaimStatus.DRAFT]: [ClaimStatus.PREAUTH_PENDING],
  [ClaimStatus.PREAUTH_PENDING]: [
    ClaimStatus.PREAUTH_APPROVED,
    ClaimStatus.PREAUTH_REJECTED,
  ],
  [ClaimStatus.PREAUTH_APPROVED]: [ClaimStatus.FINAL_APPROVAL_PENDING],
  [ClaimStatus.PREAUTH_REJECTED]: [
    ClaimStatus.RECONSIDERATION_PENDING,
    ClaimStatus.CLOSED,
  ],
  [ClaimStatus.RECONSIDERATION_PENDING]: [
    ClaimStatus.PREAUTH_APPROVED,
    ClaimStatus.PREAUTH_REJECTED,
    ClaimStatus.FINAL_APPROVED,
    ClaimStatus.FINAL_REJECTED,
  ],
  [ClaimStatus.FINAL_APPROVAL_PENDING]: [
    ClaimStatus.FINAL_APPROVED,
    ClaimStatus.FINAL_REJECTED,
  ],
  [ClaimStatus.FINAL_APPROVED]: [ClaimStatus.SETTLEMENT_PENDING],
  [ClaimStatus.FINAL_REJECTED]: [
    ClaimStatus.RECONSIDERATION_PENDING,
    ClaimStatus.CLOSED,
  ],
  [ClaimStatus.SETTLEMENT_PENDING]: [ClaimStatus.SETTLED],
  [ClaimStatus.SETTLED]: [ClaimStatus.DEPOSIT_PENDING],
  [ClaimStatus.DEPOSIT_PENDING]: [
    ClaimStatus.DEPOSIT_RETURNED,
    ClaimStatus.CLOSED,
  ],
  [ClaimStatus.DEPOSIT_RETURNED]: [ClaimStatus.CLOSED],
  [ClaimStatus.CLOSED]: [],
};

const reimbursementWorkflow: ClaimWorkflowMap = {
  [ClaimStatus.DRAFT]: [ClaimStatus.DOCUMENTS_PENDING],
  [ClaimStatus.DOCUMENTS_PENDING]: [ClaimStatus.SUBMITTED],
  [ClaimStatus.SUBMITTED]: [
    ClaimStatus.QUERY_RAISED,
    ClaimStatus.SETTLEMENT_PENDING,
  ],
  [ClaimStatus.QUERY_RAISED]: [ClaimStatus.QUERY_RESPONDED],
  [ClaimStatus.QUERY_RESPONDED]: [ClaimStatus.SETTLEMENT_PENDING],
  [ClaimStatus.SETTLEMENT_PENDING]: [ClaimStatus.SETTLED],
  [ClaimStatus.SETTLED]: [ClaimStatus.CLOSED],
  [ClaimStatus.CLOSED]: [],
  [ClaimStatus.PREAUTH_PENDING]: [],
  [ClaimStatus.PREAUTH_APPROVED]: [],
  [ClaimStatus.PREAUTH_REJECTED]: [],
  [ClaimStatus.RECONSIDERATION_PENDING]: [],
  [ClaimStatus.FINAL_APPROVAL_PENDING]: [],
  [ClaimStatus.FINAL_APPROVED]: [],
  [ClaimStatus.FINAL_REJECTED]: [],
  [ClaimStatus.DEPOSIT_PENDING]: [],
  [ClaimStatus.DEPOSIT_RETURNED]: [],
};

const workflowMapByType: Record<ClaimType, ClaimWorkflowMap> = {
  [ClaimType.CASHLESS]: cashlessWorkflow,
  [ClaimType.REIMBURSEMENT]: reimbursementWorkflow,
};

export const getAllowedStatusTransitions = (
  claimType: ClaimType,
  currentStatus: ClaimStatus
): ClaimStatus[] => {
  return workflowMapByType[claimType]?.[currentStatus] ?? [];
};

export const validateClaimStatusTransition = (
  claimType: ClaimType,
  currentStatus: ClaimStatus,
  nextStatus: ClaimStatus
): void => {
  const allowedNext = getAllowedStatusTransitions(claimType, currentStatus);

  if (!allowedNext.includes(nextStatus)) {
    throw new AppError(
      `Invalid transition from ${currentStatus} to ${nextStatus} for claim type ${claimType}`,
      400
    );
  }
};
