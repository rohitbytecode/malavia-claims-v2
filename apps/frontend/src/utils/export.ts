import { labelize } from "./format";
import type {
  ReportSummaryRow,
  InsurancePerformanceRow,
  SettlementRow,
  SettlementTotals,
  DetailedClaim,
} from "../types/reports";
import { APP_CONFIG } from "../../../backend/src/config/app";

interface ExportReportParams {
  periodLabel: string;
  totalClaims: number;
  totalAmount: number;
  summary: ReportSummaryRow[];
  insuranceData: InsurancePerformanceRow[];
  settlements: SettlementRow[];
  settlementTotals: SettlementTotals;
  settlementCount: number;
  detailedClaims: DetailedClaim[];
  visibleColumns: Record<string, boolean>;
  patientMap: Map<string, string>;
  doctorMap: Map<string, string>;
  departmentMap: Map<string, string>;
  reportMode: "monthly" | "calendar" | "financial" | "custom";
  monthlyYear: number;
  monthlyMonth: number;
  calendarYear: number;
  financialYear: number;
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
  exportScope?: string;
  hospitalShareData?: {
    rows: any[];
    totals: any;
    count: number;
  };
  departmentReportData?: {
    groups: Array<{
      departmentId: string;
      departmentName: string;
      rows: any[];
      totals: any;
    }>;
    grandTotals: any;
  };
}

export const exportReportToCSV = ({
  periodLabel,
  totalClaims,
  totalAmount,
  summary,
  insuranceData,
  settlements,
  settlementTotals,
  settlementCount,
  detailedClaims,
  visibleColumns,
  patientMap,
  doctorMap,
  departmentMap,
  reportMode,
  monthlyYear,
  monthlyMonth,
  calendarYear,
  financialYear,
  startYear,
  startMonth,
  endYear,
  endMonth,
  hospitalShareData,
  departmentReportData,
}: ExportReportParams) => {
  const sections: string[] = [];

  // --- Header / Metadata ---
  sections.push(`"${APP_CONFIG.ORG_NAME} - Insurance Claims Financial Review"`);
  sections.push(`"Report Period: ${periodLabel.replace(/"/g, '""')}"`);
  sections.push(`"Generated: ${new Date().toLocaleString("en-IN")}"`);
  sections.push(`"Total Claims: ${totalClaims}"`);
  sections.push(`"Total Amount: ${totalAmount}"`);
  sections.push(""); // Empty spacer row

  // --- Section 1: Claims by Status ---
  if (summary && summary.length > 0) {
    sections.push(`"CLAIMS BY STATUS"`);
    sections.push(`"Status","Count","Total Amount"`);
    summary.forEach((row) => {
      sections.push(
        `"${labelize(row._id ?? row.status).replace(/"/g, '""')}","${row.count ?? 0}","${row.totalAmount ?? 0}"`
      );
    });
    sections.push(""); // Empty spacer row
  }

  // --- Section 2: Insurance Company Performance ---
  if (insuranceData.length > 0) {
    sections.push(`"INSURANCE COMPANY PERFORMANCE"`);
    sections.push(
      `"Insurance Company","Total Claims","Claim Amount","Settled Claims","Settlement Ratio"`
    );
    insuranceData.forEach((row) => {
      const ratio = Math.round(row.settlementRatio ?? 0);
      sections.push(
        `"${row.companyName.replace(/"/g, '""')}","${row.totalClaims}","${row.totalClaimAmount}","${row.settledClaims}","${ratio}%"`
      );
    });
    sections.push(""); // Empty spacer row
  }

  // --- Section 3: Settlement Financial Review ---
  if (settlements.length > 0) {
    sections.push(`"SETTLEMENT FINANCIAL REVIEW"`);

    // Totals KPI row
    sections.push(
      `"Settlements Count","Total Approved","Total Deductions","Total TDS","Total Hospital Discount","Total Net Payable (Before TDS)","Total Net Payable (After TDS)"`
    );
    const totalNetBeforeTds = (settlementTotals.totalNetPayable ?? 0) + (settlementTotals.totalTds ?? 0);
    sections.push(
      `"${settlementCount}","${settlementTotals.totalApproved ?? 0}","${settlementTotals.totalDeductions ?? 0}","${settlementTotals.totalTds ?? 0}","${settlementTotals.totalHospitalDiscount ?? 0}","${totalNetBeforeTds}","${settlementTotals.totalNetPayable ?? 0}"`
    );
    sections.push(""); // spacer

    // Detail Rows
    sections.push(
      `"Claim No.","Patient ID","Insurance Company","Claim Amount","Approved","Deductions","TDS","Hospital Discount","Net Payable (Before TDS)","Net Payable (After TDS)","Method","Date"`
    );
    settlements.forEach((s) => {
      const dateStr = s.settlementDate
        ? new Date(s.settlementDate).toLocaleDateString("en-IN")
        : "—";
      const netBeforeTds = (s.netPayable ?? 0) + (s.tds ?? 0);
      sections.push(
        `"${(s.claimNumber || "—").replace(/"/g, '""')}","${(s.patientId || "—").replace(/"/g, '""')}","${(s.insuranceCompany || "—").replace(/"/g, '""')}","${s.totalClaimAmount ?? 0}","${s.approvedAmount ?? 0}","${s.deductions ?? 0}","${s.tds ?? 0}","${s.hospitalDiscount ?? 0}","${netBeforeTds}","${s.netPayable ?? 0}","${labelize(s.settlementMethod)}","${dateStr}"`
      );
    });
    // Totals footer row at the end of detail rows
    sections.push(
      `"TOTALS","","","${settlementTotals.totalClaimAmount ?? 0}","${settlementTotals.totalApproved ?? 0}","${settlementTotals.totalDeductions ?? 0}","${settlementTotals.totalTds ?? 0}","${settlementTotals.totalHospitalDiscount ?? 0}","${totalNetBeforeTds}","${settlementTotals.totalNetPayable ?? 0}","",""`
    );
    sections.push(""); // Empty spacer row
  }

  // --- Section 4: Detailed Claims ---
  if (detailedClaims.length > 0) {
    sections.push(`"DETAILED CLAIMS"`);

    const activeCols = [
      { key: "claimNo", label: "Claim No." },
      { key: "patientId", label: "Patient ID" },
      { key: "patientName", label: "Patient name" },
      { key: "doctorName", label: "Doctor name" },
      { key: "department", label: "department" },
      { key: "type", label: "Type" },
      { key: "status", label: "Status" },
      { key: "claimAmount", label: "Claim amount" },
      { key: "deposit", label: "deposit" },
    ].filter((col) => visibleColumns[col.key]);

    const headers = activeCols
      .map((col) => `"${col.label.replace(/"/g, '""')}"`)
      .join(",");
    sections.push(headers);

    detailedClaims.forEach((claim) => {
      const rowValues = activeCols.map((col) => {
        let val = "";
        switch (col.key) {
          case "claimNo":
            val =
              claim.claimNumber || claim.claimId?.toString().slice(-8) || "";
            break;
          case "patientId":
            val = claim.patientId || "";
            break;
          case "patientName":
            val =
              patientMap.get(claim.patientId) ??
              claim.patientName?.trim() ??
              "Unknown";
            break;
          case "doctorName":
            val = doctorMap.get(claim.doctorId)
              ? `Dr. ${doctorMap.get(claim.doctorId)}`
              : typeof claim.doctor === "object" && claim.doctor?.name
                ? `Dr. ${claim.doctor.name}`
                : "—";
            break;
          case "department":
            val = departmentMap.get(claim.departmentId)
              ? departmentMap.get(claim.departmentId)!
              : typeof claim.department === "object" && claim.department?.name
                ? claim.department.name
                : "—";
            break;
          case "type":
            val = claim.type || "—";
            break;
          case "status":
            val = labelize(claim.status) || "";
            break;
          case "claimAmount":
            val = claim.totalClaimAmount?.toString() || "0";
            break;
          case "deposit":
            val = claim.depositAmount?.toString() || "0";
            break;
        }
        return `"${val.toString().replace(/"/g, '""')}"`;
      });
      sections.push(rowValues.join(","));
    });

    const detailedClaimAmountTotal = detailedClaims.reduce(
      (sum, claim) => sum + (claim.totalClaimAmount ?? 0),
      0
    );
    const detailedDepositTotal = detailedClaims.reduce(
      (sum, claim) => sum + (claim.depositAmount ?? 0),
      0
    );

    const totalsRow = activeCols
      .map((col) => {
        if (col.key === "claimNo") {
          return `"TOTALS"`;
        }
        if (col.key === "claimAmount") {
          return `"${detailedClaimAmountTotal}"`;
        }
        if (col.key === "deposit") {
          return `"${detailedDepositTotal}"`;
        }
        return `""`;
      })
      .join(",");
    sections.push(totalsRow);
  }

  // --- Section 5: Hospital Share & Vendor Payout ---
  if (
    hospitalShareData &&
    hospitalShareData.rows &&
    hospitalShareData.rows.length > 0
  ) {
    sections.push(`"HOSPITAL SHARE & VENDOR PAYOUT"`);
    sections.push(
      `"Date","Claim Number","Insurance Company","Approved","Net Payable (Before TDS)","Net Payable (After TDS)","Pharmacy","Laboratory","Radiology","Total Vendor","Hospital Share (Before TDS)","Hospital Share (After TDS)"`
    );

    hospitalShareData.rows.forEach((row) => {
      const dateStr = row.settlementDate
        ? new Date(row.settlementDate).toLocaleDateString("en-IN")
        : "—";
      const netBeforeTds = (row.netPayable ?? 0) + (row.tds ?? 0);
      const shareBeforeTds = (row.hospitalShare ?? 0) + (row.tds ?? 0);
      sections.push(
        `"${dateStr}","${(row.claimNumber || "—").replace(/"/g, '""')}","${(row.insuranceCompany || "—").replace(/"/g, '""')}","${row.approvedAmount ?? 0}","${netBeforeTds}","${row.netPayable ?? 0}","${row.pharmacyShare ?? 0}","${row.labShare ?? 0}","${row.radiologyShare ?? 0}","${row.vendorPayout ?? 0}","${shareBeforeTds}","${row.hospitalShare ?? 0}"`
      );
    });

    const totals = hospitalShareData.totals;
    if (totals) {
      const totalNetBeforeTds = (totals.totalNetPayable ?? 0) + (totals.totalTds ?? 0);
      const totalShareBeforeTds = (totals.totalHospitalShare ?? 0) + (totals.totalTds ?? 0);
      sections.push(
        `"TOTALS","","","${totals.totalApproved ?? 0}","${totalNetBeforeTds}","${totals.totalNetPayable ?? 0}","${totals.totalPharmacyShare ?? 0}","${totals.totalLabShare ?? 0}","${totals.totalRadiologyShare ?? 0}","${totals.totalVendorPayout ?? 0}","${totalShareBeforeTds}","${totals.totalHospitalShare ?? 0}"`
      );
    }
    sections.push(""); // spacer
  }

  // --- Section 6: Department-wise Report ---
  if (departmentReportData && departmentReportData.groups && departmentReportData.groups.length > 0) {
    sections.push(`"DEPARTMENT-WISE FINANCIAL REPORT"`);
    sections.push("");

    departmentReportData.groups.forEach((group) => {
      sections.push(`"DEPARTMENT: ${group.departmentName.toUpperCase()}"`);
      sections.push(
        `"Patient ID / Name","Claim No.","Approved Amount","Deductions","TDS","Pharmacy","Laboratory","Radiology","Others","Net (Before TDS)","Net (After TDS)"`
      );
      group.rows.forEach((row) => {
        const netBeforeTds = (row.netPayable ?? 0) + (row.tds ?? 0);
        sections.push(
          `"${row.patientName} (${row.patientId})","${row.claimNumber || "—"}","${row.approvedAmount}","${row.deductions}","${row.tds}","${row.pharmacy}","${row.lab}","${row.radiology}","${row.others}","${netBeforeTds}","${row.netPayable}"`
        );
      });
      const groupNetBeforeTds = (group.totals.netPayable ?? 0) + (group.totals.tds ?? 0);
      sections.push(
        `"DEPARTMENT TOTAL","","${group.totals.approvedAmount}","${group.totals.deductions}","${group.totals.tds}","${group.totals.pharmacy}","${group.totals.lab}","${group.totals.radiology}","${group.totals.others}","${groupNetBeforeTds}","${group.totals.netPayable}"`
      );
      sections.push(""); // spacer
    });

    const gt = departmentReportData.grandTotals;
    if (gt) {
      const grandNetBeforeTds = (gt.netPayable ?? 0) + (gt.tds ?? 0);
      sections.push(
        `"GRAND TOTALS","","${gt.approvedAmount}","${gt.deductions}","${gt.tds}","${gt.pharmacy}","${gt.lab}","${gt.radiology}","${gt.others}","${grandNetBeforeTds}","${gt.netPayable}"`
      );
    }
    sections.push(""); // spacer
  }

  const csvContent = "\uFEFF" + sections.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  const fileSuffix =
    reportMode === "monthly"
      ? `${monthlyYear}_${monthlyMonth.toString().padStart(2, "0")}`
      : reportMode === "calendar"
        ? `CY_${calendarYear}`
        : reportMode === "financial"
          ? `FY_${financialYear}_${(financialYear + 1).toString().slice(-2)}`
          : `Custom_${startYear}_${startMonth.toString().padStart(2, "0")}_to_${endYear}_${endMonth.toString().padStart(2, "0")}`;

  link.setAttribute(
    "download",
    `comprehensive_claims_report_${fileSuffix}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
