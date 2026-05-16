export type Role = "SUPER_ADMIN" | "ADMIN" | "CLAIM_MANAGER" | "CLAIM_EXECUTIVE" | "ACCOUNTANT";
export type ClaimType = "CASHLESS" | "REIMBURSEMENT";
export type ClaimStatus =
  | "DRAFT" | "PREAUTH_PENDING" | "PREAUTH_APPROVED" | "PREAUTH_REJECTED" | "RECONSIDERATION_PENDING"
  | "FINAL_APPROVAL_PENDING" | "FINAL_APPROVED" | "FINAL_REJECTED" | "DOCUMENTS_PENDING" | "SUBMITTED"
  | "QUERY_RAISED" | "QUERY_RESPONDED" | "QUERY_RESPONSED" | "SETTLEMENT_PENDING" | "SETTLED"
  | "DEPOSIT_PENDING" | "DEPOSIT_RETURNED" | "CLOSED";
export type SettlementMethod = "PORTAL" | "EMAIL" | "COURIER";
export type SubmissionMethod = "PORTAL" | "EMAIL" | "COURIER";
export type RefundMode = "CASH" | "ONLINE";
export type RefundStatus = "PENDING" | "COMPLETED";
export type DocumentType = "PREAUTH" | "FINAL_BILL" | "DISCHARGE_SUMMARY" | "SETTLEMENT_COPY" | "QUERY_DOCUMENT" | "LAB_REPORT" | "PHARMACY_BILL" | "OTHER";
export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AlertType = "COURIER_DELAY" | "DEPOSIT_MISMATCH" | "PREAUTH_PENDING" | "FINAL_APPROVAL_PENDING" | "SETTLEMENT_PENDING";
export type CommunicationMedium = "EMAIL" | "PORTAL" | "COURIER" | "PHONE" | "IN_PERSON";
export type AuditModule = "CLAIMS" | "SETTLEMENTS" | "DEPOSITS" | "DEPARTMENT_ALLOCATIONS" | "ALERTS" | "USERS" | "AUTH";
export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE";

export interface ApiResponse<T> { success: boolean; message: string; data: T; }
export interface Paginated<T> { data: T[]; pagination?: Pagination; total?: number; page?: number; limit?: number; totalPages?: number; }
export interface Pagination { page: number; limit: number; total: number; totalPages: number; }
export interface ListParams { page?: number; limit?: number; status?: ClaimStatus; type?: ClaimType; isActive?: boolean; search?: string; sortBy?: string; sortOrder?: "asc" | "desc"; }

export interface User { _id: string; id?: string; fullName: string; email: string; role: Role; isActive: boolean; createdAt?: string; updatedAt?: string; }
export interface AuthTokens { accessToken: string; refreshToken: string; }
export interface AuthPayload extends AuthTokens { user: User; }

export interface Claim {
  _id: string; id?: string; claimNumber?: string; type: ClaimType; status: ClaimStatus; insuranceCompanyId?: string | InsuranceCompany;
  patientId: string; hospitalId: string; departmentId?: string | Department; totalClaimAmount: number; tdsAmount?: number;
  deductions?: number; hospitalDiscount?: number; depositAmount?: number; refundAmount?: number; remarks?: string | string[];
  createdBy?: string | User; createdAt: string; updatedAt: string;
}
export interface ClaimHistory { _id: string; claimId: string; fromStatus?: ClaimStatus; toStatus: ClaimStatus; remarks?: string; performedBy?: string | User; createdAt: string; }
export interface Settlement { _id: string; claimId: string; approvedAmount: number; hospitalDiscount: number; deductions: number; tds: number; netPayable: number; settlementMethod: SettlementMethod; settlementDate: string; remarks?: string[]; settledBy: string | User; createdAt: string; updatedAt: string; }
export interface Allocation { _id: string; settlementId: string; departmentId: string | Department; amount: number; remarks?: string; allocatedBy: string | User; createdAt: string; }
export interface Deposit { _id: string; claimId: string; collectedAmount: number; refundAmount: number; refundStatus: RefundStatus; refundMode?: RefundMode; remarks?: string[]; createdBy: string | User; updatedBy?: string | User; createdAt: string; updatedAt: string; }
export interface ClaimDocument { _id: string; claimId: string; documentType: DocumentType; fileName: string; originalName: string; mimeType: string; filePath: string; uploadedBy?: string | User; remarks?: string; version: number; createdAt: string; updatedAt: string; }
export interface Alert { _id: string; claimId: string; type: AlertType; severity: AlertSeverity; message: string; resolved: boolean; resolvedAt?: string; resolvedBy?: string | User; createdAt: string; updatedAt: string; }
export interface Communication { _id: string; claimId: string; type: string; medium: CommunicationMedium; remarks?: string; followUpDate?: string; createdBy?: string | User; createdAt: string; updatedAt: string; }
export interface Department { _id: string; name: string; code: string; description?: string; isActive: boolean; createdAt?: string; updatedAt?: string; }
export interface ContactPerson { name: string; email: string; phone: string; designation?: string; }
export interface EscalationContact { name: string; email: string; phone: string; level: string; }
export interface InsuranceCompany { _id: string; name: string; submissionMethods: SubmissionMethod[]; portalUrl?: string; portalUsername?: string; email?: string; courierAddress?: string; tatDays?: number; contactPersons: ContactPerson[]; escalationMatrix: EscalationContact[]; remarks?: string; isActive: boolean; createdAt?: string; updatedAt?: string; }
export interface AuditLog { _id: string; module: AuditModule; action: AuditAction; entityId: string; actorId?: string | User; before?: unknown; after?: unknown; remarks?: string; createdAt: string; }
export interface TimelineEvent { id?: string; _id?: string; type: "STATUS" | "COMMUNICATION" | "DOCUMENT" | "SETTLEMENT" | "ALERT" | "AUDIT"; title?: string; status?: ClaimStatus; fromStatus?: ClaimStatus; toStatus?: ClaimStatus; medium?: CommunicationMedium; message?: string; remarks?: string; actor?: string | User; createdAt: string; attachmentName?: string; severity?: AlertSeverity; }
export interface DashboardMetrics { pendingCounts: { preauth: number; finalApproval: number; settlements: number }; delayedClaims: { over45Days: number; over60Days: number }; pendingDepositRefunds: number; activeAlertsCount: number; financials: { totalSettledAmount: number }; claimsByStatus: { status: ClaimStatus; count: number }[]; ageingSummary: { under30Days: number; between30And60Days: number; between60And90Days: number; over90Days: number }; }
export interface ReportRow { _id?: string; status?: ClaimStatus; companyName?: string; count?: number; totalAmount?: number; totalClaims?: number; totalClaimAmount?: number; settledClaims?: number; settlementRatio?: number; }
