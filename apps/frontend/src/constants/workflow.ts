import type { ClaimStatus, ClaimType, Role } from "../types/domain";
export const claimStatuses: ClaimStatus[] = [
  "DRAFT",
  "PREAUTH_PENDING",
  "PREAUTH_APPROVED",
  "PREAUTH_REJECTED",
  "RECONSIDERATION_PENDING",
  "FINAL_APPROVAL_PENDING",
  "FINAL_APPROVED",
  "FINAL_REJECTED",
  "DOCUMENTS_PENDING",
  "SUBMITTED",
  "QUERY_RAISED",
  "QUERY_RESPONDED",
  "QUERY_RESPONSED",
  "SETTLEMENT_PENDING",
  "SETTLED",
  "DEPOSIT_PENDING",
  "DEPOSIT_RETURNED",
  "CLOSED",
];
export const claimTypes: ClaimType[] = ["CASHLESS", "REIMBURSEMENT"];
export const operationalRoles: Role[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "CLAIM_MANAGER",
  "CLAIM_EXECUTIVE",
  "ACCOUNTANT",
];
export const adminRoles: Role[] = ["SUPER_ADMIN", "ADMIN"];
export const accountantRoles: Role[] = ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"];
export const managerRoles: Role[] = ["SUPER_ADMIN", "ADMIN", "CLAIM_MANAGER"];
const cashless: Partial<Record<ClaimStatus, ClaimStatus[]>> = {
  DRAFT: ["PREAUTH_PENDING"],
  PREAUTH_PENDING: ["PREAUTH_APPROVED", "PREAUTH_REJECTED"],
  PREAUTH_APPROVED: ["FINAL_APPROVAL_PENDING"],
  PREAUTH_REJECTED: ["RECONSIDERATION_PENDING", "CLOSED"],
  RECONSIDERATION_PENDING: [
    "PREAUTH_APPROVED",
    "PREAUTH_REJECTED",
    "FINAL_APPROVED",
    "FINAL_REJECTED",
  ],
  FINAL_APPROVAL_PENDING: ["FINAL_APPROVED", "FINAL_REJECTED"],
  FINAL_APPROVED: ["SETTLEMENT_PENDING"],
  FINAL_REJECTED: ["RECONSIDERATION_PENDING", "CLOSED"],
  SETTLEMENT_PENDING: ["SETTLED"],
  SETTLED: ["DEPOSIT_PENDING"],
  DEPOSIT_PENDING: ["DEPOSIT_RETURNED", "CLOSED"],
  DEPOSIT_RETURNED: ["CLOSED"],
  CLOSED: [],
};
const reimbursement: Partial<Record<ClaimStatus, ClaimStatus[]>> = {
  DRAFT: ["DOCUMENTS_PENDING"],
  DOCUMENTS_PENDING: ["SUBMITTED"],
  SUBMITTED: ["QUERY_RAISED", "SETTLEMENT_PENDING"],
  QUERY_RAISED: ["QUERY_RESPONDED", "QUERY_RESPONSED"],
  QUERY_RESPONDED: ["SETTLEMENT_PENDING"],
  QUERY_RESPONSED: ["SETTLEMENT_PENDING"],
  SETTLEMENT_PENDING: ["SETTLED"],
  SETTLED: ["CLOSED"],
  CLOSED: [],
};
export function allowedTransitions(
  type: ClaimType,
  status: ClaimStatus
): ClaimStatus[] {
  return (type === "CASHLESS" ? cashless : reimbursement)[status] ?? [];
}
export function canRoleTransition(
  role: Role,
  nextStatus: ClaimStatus
): boolean {
  if (nextStatus === "CLOSED") return managerRoles.includes(role);
  if (nextStatus === "SETTLED") return accountantRoles.includes(role);
  if (["FINAL_APPROVED", "FINAL_REJECTED"].includes(nextStatus))
    return managerRoles.includes(role);
  return operationalRoles.includes(role);
}
export function canReopen(role?: Role): boolean {
  return role === "SUPER_ADMIN";
}
