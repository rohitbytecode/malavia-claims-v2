export interface ReportSummaryRow {
  _id: string;
  count: number;
  totalAmount: number;
  status?: string;
}

export interface DetailedClaim {
  claimId: string;
  claimNumber: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  departmentId: string;
  type: string;
  status: string;
  totalClaimAmount: number;
  settledAmount?: number | null;
  depositAmount: number;
  doctor?: { name: string };
  department?: { name: string };
  billBreakdown?: { departmentCategory: string; amount: number }[];
}

export interface DetailedClaim {
  claimId: string;
  claimNumber: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  departmentId: string;
  type: string;
  status: string;
  totalClaimAmount: number;
  settledAmount?: number | null;
  depositAmount: number;
  doctor?: {
    name: string;
  };
  department?: {
    name: string;
  };
}

export interface MonthlyReportData {
  summary: ReportSummaryRow[];
  detailedClaims: DetailedClaim[];
  totalClaims?: number;
  totalAmount?: number;
}

export interface InsurancePerformanceRow {
  companyName: string;
  totalClaims: number;
  totalClaimAmount: number;
  settledClaims: number;
  settlementRatio: number;
}

export interface SettlementRow {
  _id: string;
  claimId: string;
  claimNumber: string;
  patientId: string;
  insuranceCompany: string;
  totalClaimAmount: number;
  approvedAmount: number;
  deductions: number;
  tds: number;
  hospitalDiscount: number;
  netPayable: number;
  settlementMethod: string;
  settlementDate: string;
  departmentId?: string;
  departmentBreakdown?: Array<{
    departmentCategory: string;
    claimedAmount: number;
    approvedAmount: number;
    deduction: number;
    discountPercent: number;
    discountAmount: number;
    netAmount: number;
    companyDiscountPercent?: number;
    companyDiscountAmount?: number;
    vendorDiscountPercent?: number;
    vendorDiscountAmount?: number;
    vendorPayout?: number;
    hospitalShare?: number;
  }>;
}

export interface SettlementTotals {
  totalClaimAmount: number;
  totalApproved: number;
  totalDeductions: number;
  totalTds: number;
  totalHospitalDiscount: number;
  totalNetPayable: number;
}

export interface SettlementReportData {
  settlements: SettlementRow[];
  totals: SettlementTotals;
  count: number;
}
