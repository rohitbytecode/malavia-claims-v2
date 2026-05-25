import { apiClient, unwrap } from "./client";
import type {
  Alert,
  Allocation,
  AuditLog,
  AuthPayload,
  Claim,
  ClaimDocument,
  ClaimHistory,
  Communication,
  DashboardMetrics,
  Department,
  Deposit,
  InsuranceCompany,
  Patient,
  Doctor,
  ListParams,
  Paginated,
  ReportRow,
  Settlement,
  TimelineEvent,
  User,
  ClaimStatus,
  DocumentType,
  RefundMode,
  SettlementMethod,
  CommunicationMedium,
  Role,
  SubmissionMethod,
} from "../types/domain";
const normalized = <T>(
  value:
    | T[]
    | Paginated<T>
    | {
        items: T[];
        pagination?: Paginated<T>["pagination"];
      }
): Paginated<T> => {
  if (Array.isArray(value)) {
    return {
      data: value,
    };
  }

  if ("items" in value) {
    return {
      data: value.items,
      pagination: value.pagination,
    };
  }

  return value;
};
export const authApi = {
  login: (body: { email: string; password: string }) =>
    unwrap<AuthPayload>(apiClient.post("/auth/login", body)),
  changePassword: (body: { oldPassword: string; newPassword: string }) =>
    unwrap<{ success: boolean }>(apiClient.post("/auth/change-password", body)),
};
export const claimsApi = {
  list: (params: ListParams) =>
    unwrap<Paginated<Claim> | Claim[]>(
      apiClient.get("/claims", { params })
    ).then(normalized),
  get: (claimId: string) => unwrap<Claim>(apiClient.get(`/claims/${claimId}`)),
  create: (body: {
    type: string;
    insuranceCompanyId?: string;
    insurerId?: string;
    patientId: string;
    hospitalId?: string;
    departmentId?: string;
    doctorId?: string;
    totalClaimAmount: number;
    depositAmount?: number;
    remarks?: string;
    createdBy?: string;
  }) => unwrap<Claim>(apiClient.post("/claims", body)),
  transition: (
    claimId: string,
    body: {
      toStatus: ClaimStatus;
      remarks?: string;
      performedBy?: string;
      claimNumber?: string;
      totalClaimAmount?: number;
      depositAmount?: number;
      refundAmount?: number;
    }
  ) =>
    unwrap<Claim>(apiClient.post(`/claims/${claimId}/status-transition`, body)),
  history: (claimId: string) =>
    unwrap<ClaimHistory[]>(apiClient.get(`/claims/${claimId}/history`)),
};
export const dashboardApi = {
  metrics: () => unwrap<DashboardMetrics>(apiClient.get("/dashboard/metrics")),
};
export const settlementApi = {
  getByClaim: (claimId: string) =>
    unwrap<Settlement | null>(apiClient.get(`/settlements/claim/${claimId}`)),
  create: (body: {
    claimId: string;
    approvedAmount: number;
    hospitalDiscount?: number;
    deductions?: number;
    tds?: number;
    settlementMethod: SettlementMethod;
    remarks?: string;
    settledBy: string;
    refundAmount?: number;
  }) => unwrap<Settlement>(apiClient.post("/settlements", body)),
};
export const allocationApi = {
  list: (settlementId: string) =>
    unwrap<Allocation[]>(
      apiClient.get(`/department-allocations/settlement/${settlementId}`)
    ),
  create: (body: {
    settlementId: string;
    allocations: { departmentId: string; amount: number; remarks?: string }[];
    allocatedBy: string;
  }) => unwrap<Allocation[]>(apiClient.post("/department-allocations", body)),
};
export const depositApi = {
  getByClaim: (claimId: string) =>
    unwrap<Deposit | null>(apiClient.get(`/deposits/claim/${claimId}`)),
  create: (body: {
    claimId: string;
    collectedAmount: number;
    remarks?: string;
    createdBy: string;
  }) => unwrap<Deposit>(apiClient.post("/deposits", body)),
  refund: (
    depositId: string,
    body: {
      refundAmount: number;
      refundMode: RefundMode;
      remarks?: string;
      updatedBy: string;
    }
  ) => unwrap<Deposit>(apiClient.patch(`/deposits/${depositId}/refund`, body)),
};
export const documentApi = {
  list: (claimId: string) =>
    unwrap<ClaimDocument[]>(
      apiClient.get("/documents", { params: { claimId } })
    ),
  upload: (body: FormData) =>
    unwrap<ClaimDocument>(
      apiClient.post("/documents/upload", body, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ),
  download: (filename: string) =>
    apiClient
      .get<Blob>(`/documents/download/${filename}`, {
        responseType: "blob",
      })
      .then((res) => res.data),
};
export const alertApi = {
  active: (params: { page?: number; limit?: number } = {}) =>
    unwrap<Paginated<Alert> | Alert[]>(
      apiClient.get("/alerts/active", { params })
    ).then(normalized),
  byClaim: (claimId: string) =>
    unwrap<Alert[]>(apiClient.get(`/alerts/claim/${claimId}`)),
  resolve: (alertId: string, body: { resolvedBy?: string; remarks?: string }) =>
    unwrap<Alert>(apiClient.patch(`/alerts/${alertId}/resolve`, body)),
};
export const timelineApi = {
  claim: (claimId: string) =>
    unwrap<TimelineEvent[]>(apiClient.get(`/timelines/claim/${claimId}`)),
};
export const communicationApi = {
  list: (claimId: string) =>
    unwrap<Paginated<Communication> | Communication[]>(
      apiClient.get("/communications", { params: { claimId, limit: 100 } })
    ).then(normalized),
  create: (body: {
    claimId: string;
    type: string;
    medium: CommunicationMedium;
    remarks?: string;
    followUpDate?: string;
    createdBy?: string;
  }) => unwrap<Communication>(apiClient.post("/communications", body)),
};
export const auditApi = {
  entity: (entityId: string) =>
    unwrap<Paginated<AuditLog> | AuditLog[]>(
      apiClient.get(`/audit-logs/entity/${entityId}`)
    ).then(normalized),
  module: (module: string) =>
    unwrap<Paginated<AuditLog> | AuditLog[]>(
      apiClient.get(`/audit-logs/module/${module}`)
    ).then(normalized),
};
export const reportApi = {
  monthly: (year: number, month: number, endYear?: number, endMonth?: number) =>
    unwrap<ReportRow[]>(
      apiClient.get("/reports/monthly", {
        params: { year, month, endYear, endMonth },
      })
    ),
  insurancePerformance: () =>
    unwrap<ReportRow[]>(apiClient.get("/reports/insurance-performance")),
  patientClaims: (patientId: string) =>
    unwrap<ReportRow[]>(apiClient.get(`/reports/patient-claims/${patientId}`)),
  settlementReport: (
    year: number,
    month: number,
    endYear?: number,
    endMonth?: number
  ) =>
    unwrap<any>(
      apiClient.get("/reports/settlement-report", {
        params: { year, month, endYear, endMonth },
      })
    ),
};
export const departmentApi = {
  list: (params: ListParams = {}) =>
    unwrap<Paginated<Department> | Department[]>(
      apiClient.get("/departments", { params })
    ).then(normalized),
  create: (body: {
    name: string;
    code: string;
    description?: string;
    isActive?: boolean;
  }) => unwrap<Department>(apiClient.post("/departments", body)),
  update: (
    departmentId: string,
    body: Partial<{
      name: string;
      code: string;
      description: string;
      isActive: boolean;
    }>
  ) =>
    unwrap<Department>(apiClient.patch(`/departments/${departmentId}`, body)),
  remove: (departmentId: string) =>
    unwrap<Department>(apiClient.delete(`/departments/${departmentId}`)),
};
export const patientApi = {
  list: (params: ListParams = {}) =>
    unwrap<Paginated<Patient> | Patient[]>(
      apiClient.get("/patients", { params })
    ).then(normalized),
  create: (body: {
    patientId: string;
    name: string;
    insurerId?: string | null;
    insuranceCompanyId?: string | null;
    isActive?: boolean;
  }) => unwrap<Patient>(apiClient.post("/patients", body)),
  update: (
    id: string,
    body: Partial<{
      patientId: string;
      name: string;
      insurerId: string | null;
      insuranceCompanyId: string | null;
      isActive: boolean;
    }>
  ) => unwrap<Patient>(apiClient.patch(`/patients/${id}`, body)),
  remove: (id: string) => unwrap<Patient>(apiClient.delete(`/patients/${id}`)),
};
export const doctorApi = {
  list: (params: ListParams = {}) =>
    unwrap<Paginated<Doctor> | Doctor[]>(
      apiClient.get("/doctors", { params })
    ).then(normalized),
  create: (body: { name: string; departmentId: string; isActive?: boolean }) =>
    unwrap<Doctor>(apiClient.post("/doctors", body)),
  update: (
    id: string,
    body: Partial<{
      name: string;
      departmentId: string;
      isActive: boolean;
    }>
  ) => unwrap<Doctor>(apiClient.patch(`/doctors/${id}`, body)),
  remove: (id: string) => unwrap<Doctor>(apiClient.delete(`/doctors/${id}`)),
};
export const insuranceApi = {
  list: (params: ListParams = {}) =>
    unwrap<Paginated<InsuranceCompany> | InsuranceCompany[]>(
      apiClient.get("/insurance-companies", { params })
    ).then(normalized),
  create: (body: {
    name: string;
    submissionMethods: SubmissionMethod[];
    portalUrl?: string;
    portalUsername?: string;
    portalPassword?: string;
    email?: string;
    courierAddress?: string;
    tatDays?: number;
    contactPersons?: InsuranceCompany["contactPersons"];
    escalationMatrix?: InsuranceCompany["escalationMatrix"];
    remarks?: string;
    isActive?: boolean;
  }) => unwrap<InsuranceCompany>(apiClient.post("/insurance-companies", body)),
  update: (
    companyId: string,
    body: Partial<{
      name: string;
      submissionMethods: SubmissionMethod[];
      portalUrl: string;
      portalUsername: string;
      portalPassword: string;
      email: string;
      courierAddress: string;
      tatDays: number;
      contactPersons: InsuranceCompany["contactPersons"];
      escalationMatrix: InsuranceCompany["escalationMatrix"];
      remarks: string;
      isActive: boolean;
    }>
  ) =>
    unwrap<InsuranceCompany>(
      apiClient.patch(`/insurance-companies/${companyId}`, body)
    ),
  remove: (companyId: string) =>
    unwrap<InsuranceCompany>(
      apiClient.delete(`/insurance-companies/${companyId}`)
    ),
};
export const usersApi = {
  list: (params: ListParams = {}) =>
    unwrap<Paginated<User> | User[]>(apiClient.get("/users", { params })).then(
      normalized
    ),
  create: (body: {
    fullName: string;
    email: string;
    password?: string;
    role: Role;
    isActive?: boolean;
  }) =>
    unwrap<User & { tempPassword?: string }>(apiClient.post("/users", body)),
  update: (
    userId: string,
    body: Partial<{
      fullName: string;
      email: string;
      password: string;
      role: Role;
      isActive: boolean;
    }>
  ) => unwrap<User>(apiClient.patch(`/users/${userId}`, body)),
  deactivate: (userId: string) =>
    unwrap<User>(apiClient.patch(`/users/${userId}/deactivate`)),
};
export const documentTypes: DocumentType[] = [
  "PREAUTH",
  "FINAL_BILL",
  "DISCHARGE_SUMMARY",
  "SETTLEMENT_COPY",
  "QUERY_DOCUMENT",
  "LAB_REPORT",
  "PHARMACY_BILL",
  "OTHER",
];
