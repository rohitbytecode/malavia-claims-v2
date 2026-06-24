import type {
  AlertSeverity,
  AlertType,
  ClaimStatus,
  ClaimType,
  Role,
} from "../types/domain";
import {
  accountantRoles,
  adminRoles,
  managerRoles,
  operationalRoles,
} from "./workflow";

export interface WorkflowStage {
  id: ClaimStatus;
  label: string;
  group: "intake" | "insurer" | "approval" | "finance" | "closure";
  irreversible?: boolean;
  risk?: "normal" | "warning" | "critical" | "success";
}

export const cashlessStages: WorkflowStage[] = [
  { id: "DRAFT", label: "Draft", group: "intake" },
  {
    id: "PREAUTH_PENDING",
    label: "Preauth Pending",
    group: "insurer",
    risk: "warning",
  },
  {
    id: "PREAUTH_APPROVED",
    label: "Preauth Approved",
    group: "insurer",
    risk: "success",
  },
  {
    id: "FINAL_APPROVAL_PENDING",
    label: "Final Approval",
    group: "approval",
    risk: "warning",
  },
  {
    id: "FINAL_APPROVED",
    label: "Final Approved",
    group: "approval",
    risk: "success",
  },
  {
    id: "SETTLEMENT_PENDING",
    label: "Settlement",
    group: "finance",
    risk: "warning",
  },
  { id: "SETTLED", label: "Settled", group: "finance", risk: "success" },
  {
    id: "DEPOSIT_PENDING",
    label: "Deposit Refund",
    group: "finance",
    risk: "warning",
  },
  {
    id: "DEPOSIT_RETURNED",
    label: "Deposit Returned",
    group: "finance",
    risk: "success",
  },
  { id: "CLOSED", label: "Closed", group: "closure", irreversible: true },
];

export const reimbursementStages: WorkflowStage[] = [
  { id: "DRAFT", label: "Draft", group: "intake" },
  {
    id: "DOCUMENTS_PENDING",
    label: "Documents",
    group: "intake",
    risk: "warning",
  },
  { id: "SUBMITTED", label: "Submitted", group: "insurer" },
  {
    id: "QUERY_RAISED",
    label: "Query Raised",
    group: "insurer",
    risk: "critical",
  },
  { id: "QUERY_RESPONDED", label: "Query Responded", group: "insurer" },
  {
    id: "SETTLEMENT_PENDING",
    label: "Settlement",
    group: "finance",
    risk: "warning",
  },
  { id: "SETTLED", label: "Settled", group: "finance", risk: "success" },
  { id: "CLOSED", label: "Closed", group: "closure", irreversible: true },
];

export const getWorkflowStages = (type: ClaimType): WorkflowStage[] =>
  type === "CASHLESS" ? cashlessStages : reimbursementStages;

export const terminalStatuses: ClaimStatus[] = ["CLOSED"];
export const financeControlledStatuses: ClaimStatus[] = [
  "SETTLEMENT_PENDING",
  "SETTLED",
  "DEPOSIT_PENDING",
  "DEPOSIT_RETURNED",
];
export const insurerWaitingStatuses: ClaimStatus[] = [
  "PREAUTH_PENDING",
  "FINAL_APPROVAL_PENDING",
  "QUERY_RAISED",
  "SUBMITTED",
];

export interface RoleExperience {
  role: Role;
  title: string;
  mission: string;
  primaryQueues: ClaimStatus[];
  visibleModules: string[];
  criticalActions: string[];
  guardrails: string[];
}

export const roleExperiences: Record<Role, RoleExperience> = {
  SUPER_ADMIN: {
    role: "SUPER_ADMIN",
    title: "Super Admin Control Tower",
    mission:
      "Full operational visibility, audit supervision, master-data control, and exceptional workflow recovery.",
    primaryQueues: [
      "PREAUTH_PENDING",
      "FINAL_APPROVAL_PENDING",
      "SETTLEMENT_PENDING",
      "CLOSED",
    ],
    visibleModules: [
      "All modules",
      "Audit history",
      "User governance",
      "Workflow recovery",
    ],
    criticalActions: [
      "Reopen closed claims",
      "Resolve critical alerts",
      "Review audit exceptions",
      "Govern users",
    ],
    guardrails: [
      "Reopening requires explicit audit reason",
      "System workflow map still validates every transition",
    ],
  },
  ADMIN: {
    role: "ADMIN",
    title: "Administration Command Desk",
    mission:
      "Supervise claim throughput, insurer bottlenecks, settlement readiness, and operational escalations.",
    primaryQueues: [
      "PREAUTH_PENDING",
      "FINAL_APPROVAL_PENDING",
      "SETTLEMENT_PENDING",
      "QUERY_RAISED",
    ],
    visibleModules: [
      "Claims",
      "Alerts",
      "Reports",
      "Insurance",
      "Departments",
      "Users",
    ],
    criticalActions: [
      "Approve final-stage movement",
      "Close permitted workflows",
      "Resolve alerts",
      "Maintain masters",
    ],
    guardrails: [
      "Cannot bypass invalid system transitions",
      "Closed claims remain locked",
    ],
  },
  CLAIM_MANAGER: {
    role: "CLAIM_MANAGER",
    title: "Claim Manager Workflow Bridge",
    mission:
      "Drive insurer-facing workflow movement and prevent claims from ageing into escalation bands.",
    primaryQueues: [
      "PREAUTH_PENDING",
      "FINAL_APPROVAL_PENDING",
      "QUERY_RAISED",
      "DOCUMENTS_PENDING",
    ],
    visibleModules: ["Claims", "Alerts", "Reports"],
    criticalActions: [
      "Move workflow stages",
      "Close eligible claims",
      "Coordinate documents",
      "Record follow-ups",
    ],
    guardrails: [
      "Settlement finalization is finance-controlled",
      "Closed claims cannot be reopened",
    ],
  },
  CLAIM_EXECUTIVE: {
    role: "CLAIM_EXECUTIVE",
    title: "Claim Executive Workbench",
    mission:
      "Handle daily document uploads, communications, insurer follow-ups, and clean claim submissions.",
    primaryQueues: [
      "DOCUMENTS_PENDING",
      "PREAUTH_PENDING",
      "QUERY_RAISED",
      "SUBMITTED",
    ],
    visibleModules: ["Claims", "Alerts", "Reports"],
    criticalActions: [
      "Upload claim documents",
      "Record communications",
      "Respond to queries",
      "Update workflow where permitted",
    ],
    guardrails: [
      "Cannot close claims",
      "Cannot finalize settlements",
      "Cannot reopen closed claims",
    ],
  },
  ACCOUNTANT: {
    role: "ACCOUNTANT",
    title: "Finance Settlement Console",
    mission:
      "Control settlements, deductions, TDS, department allocation readiness, deposits, refunds, and financial reports.",
    primaryQueues: [
      "SETTLEMENT_PENDING",
      "SETTLED",
      "DEPOSIT_PENDING",
      "DEPOSIT_RETURNED",
    ],
    visibleModules: ["Settlements", "Claims", "Alerts", "Reports"],
    criticalActions: [
      "Finalize settlements",
      "Review TDS/deductions",
      "Track refunds",
      "Export financial reports",
    ],
    guardrails: [
      "Net payable is system-calculated",
      "Refund cannot exceed deposit",
      "Department allocations cannot exceed settlement",
    ],
  },
  PHARMACIST: {
    role: "PHARMACIST",
    title: "Pharmacy Vendor Control Desk",
    mission:
      "Track pharmacy department billing, verify approved shares, and coordinate Pharmacy vendor payouts.",
    primaryQueues: [
      "PREAUTH_PENDING",
      "PREAUTH_APPROVED",
      "SETTLEMENT_PENDING",
      "SETTLED",
    ],
    visibleModules: ["Claims", "Reports"],
    criticalActions: [
      "Review pharmacy bill breakdown",
      "Verify Pharmacy vendor payout and discount allocations",
      "Track settled pharmacy claims",
    ],
    guardrails: [
      "Only pharmacy department payouts are visible",
      "Cannot modify settlements or claim statuses",
    ],
  },
  PLATFORM_ADMIN: {
    role: "PLATFORM_ADMIN",
    title: "SaaS Platform Operations",
    mission:
      "Manage multi-tenant organizations, monitor billing/subscription states, and administer system-wide resources.",
    primaryQueues: [],
    visibleModules: ["Organizations", "Users", "Billing"],
    criticalActions: [
      "Suspend organizations",
      "Update global configurations",
    ],
    guardrails: [
      "All multi-tenant isolation rules still apply at data level",
    ],
  },
};

export const alertPlaybook: Record<
  AlertType,
  { label: string; response: string; ownerRoles: Role[] }
> = {
  COURIER_DELAY: {
    label: "Courier delay",
    response:
      "Escalate insurer/courier follow-up and verify physical submission trail.",
    ownerRoles: ["ADMIN", "CLAIM_MANAGER", "CLAIM_EXECUTIVE"],
  },
  DEPOSIT_MISMATCH: {
    label: "Deposit mismatch / refund",
    response:
      "Accountant verifies collection, refund status, and patient refund evidence.",
    ownerRoles: ["ACCOUNTANT", "ADMIN"],
  },
  PREAUTH_PENDING: {
    label: "Preauth pending",
    response:
      "Claim desk follows insurer/TPA preauth response and updates communication log.",
    ownerRoles: ["CLAIM_MANAGER", "CLAIM_EXECUTIVE", "ADMIN"],
  },
  FINAL_APPROVAL_PENDING: {
    label: "Final approval pending",
    response:
      "Manager supervises final approval documents and insurer confirmation.",
    ownerRoles: ["CLAIM_MANAGER", "ADMIN"],
  },
  SETTLEMENT_PENDING: {
    label: "Settlement pending",
    response:
      "Finance finalizes approved amount, TDS, deductions, and settlement method.",
    ownerRoles: ["ACCOUNTANT", "ADMIN"],
  },
};

export const severityRank: Record<AlertSeverity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export const canSeeFinance = (role?: Role): boolean =>
  Boolean(role && (accountantRoles.includes(role) || role === "PHARMACIST"));
export const canSeeAdminControls = (role?: Role): boolean =>
  Boolean(role && adminRoles.includes(role));
export const canOperateClaims = (role?: Role): boolean =>
  Boolean(role && operationalRoles.includes(role));
export const canCloseClaims = (role?: Role): boolean =>
  Boolean(role && managerRoles.includes(role));
