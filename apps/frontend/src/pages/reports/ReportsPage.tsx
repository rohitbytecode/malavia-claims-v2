import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  reportApi,
  patientApi,
  doctorApi,
  departmentApi,
} from "../../api/services";
import { ErrorPanel } from "../../components/ui/ErrorPanel";
import { Skeleton } from "../../components/ui/Skeleton";
import { formatCurrency, labelize } from "../../utils/format";
import { exportReportToCSV } from "../../utils/export";

// Sub-components
import { ReportFilters } from "./components/ReportFilters";
import { ClaimsSummary } from "./components/ClaimsSummary";
import { DetailedClaimsTable } from "./components/DetailedClaimsTable";
import { InsurancePerformanceTable } from "./components/InsurancePerformanceTable";
import { SettlementReviewTable } from "./components/SettlementReviewTable";
import { HospitalShareTable } from "./components/HospitalShareTable";
import { APP_CONFIG } from "../../../../backend/src/config/app";
// Type definitions
import type {
  ReportSummaryRow,
  DetailedClaim,
  InsurancePerformanceRow,
  SettlementReportData,
} from "../../types/reports";

const HOSPITAL_NAME = APP_CONFIG.ORG_NAME;

export function ReportsPage() {
  const now = new Date();

  // Date States
  const [reportMode, setReportMode] = useState<
    "monthly" | "calendar" | "financial" | "custom"
  >("monthly");
  const [monthlyYear, setMonthlyYear] = useState(now.getFullYear());
  const [monthlyMonth, setMonthlyMonth] = useState(now.getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());

  const defaultFinancialYear =
    now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
  const [financialYear, setFinancialYear] = useState(defaultFinancialYear);

  const [startYear, setStartYear] = useState(now.getFullYear());
  const [startMonth, setStartMonth] = useState(now.getMonth() + 1);
  const [endYear, setEndYear] = useState(now.getFullYear());
  const [endMonth, setEndMonth] = useState(now.getMonth() + 1);

  // Search States
  const [patientId, setPatientId] = useState("");
  const [patientInput, setPatientInput] = useState("");

  // Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    {
      claimNo: true,
      patientId: true,
      patientName: true,
      doctorName: true,
      department: true,
      type: true,
      status: true,
      claimAmount: true,
      deposit: true,
    }
  );

  // Derived Query Params
  const { queryYear, queryMonth, queryEndYear, queryEndMonth } = useMemo(() => {
    switch (reportMode) {
      case "monthly":
        return {
          queryYear: monthlyYear,
          queryMonth: monthlyMonth,
          queryEndYear: undefined,
          queryEndMonth: undefined,
        };
      case "calendar":
        return {
          queryYear: calendarYear,
          queryMonth: 1,
          queryEndYear: calendarYear,
          queryEndMonth: 12,
        };
      case "financial":
        return {
          queryYear: financialYear,
          queryMonth: 4,
          queryEndYear: financialYear + 1,
          queryEndMonth: 3,
        };
      case "custom":
        return {
          queryYear: startYear,
          queryMonth: startMonth,
          queryEndYear: endYear,
          queryEndMonth: endMonth,
        };
    }
  }, [
    reportMode,
    monthlyYear,
    monthlyMonth,
    calendarYear,
    financialYear,
    startYear,
    startMonth,
    endYear,
    endMonth,
  ]);

  // Derived Period Labels
  const periodLabel = useMemo(() => {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    switch (reportMode) {
      case "monthly":
        return `${monthNames[monthlyMonth - 1]} ${monthlyYear}`;
      case "calendar":
        return `Calendar Year ${calendarYear} (January - December)`;
      case "financial":
        return `Financial Year ${financialYear}-${(financialYear + 1).toString().slice(-2)} (April ${financialYear} - March ${financialYear + 1})`;
      case "custom":
        return `${monthNames[startMonth - 1]} ${startYear} to ${monthNames[endMonth - 1]} ${endYear}`;
    }
  }, [
    reportMode,
    monthlyMonth,
    monthlyYear,
    calendarYear,
    financialYear,
    startMonth,
    startYear,
    endMonth,
    endYear,
  ]);

  const periodShortLabel = useMemo(() => {
    switch (reportMode) {
      case "monthly":
        return `${monthlyMonth.toString().padStart(2, "0")}/${monthlyYear}`;
      case "calendar":
        return `CY ${calendarYear}`;
      case "financial":
        return `FY ${financialYear}-${(financialYear + 1).toString().slice(-2)}`;
      case "custom":
        return `${startMonth.toString().padStart(2, "0")}/${startYear} - ${endMonth.toString().padStart(2, "0")}/${endYear}`;
    }
  }, [
    reportMode,
    monthlyMonth,
    monthlyYear,
    calendarYear,
    financialYear,
    startMonth,
    startYear,
    endMonth,
    endYear,
  ]);

  // Queries
  const monthly = useQuery({
    queryKey: [
      "reports",
      "monthly",
      reportMode,
      queryYear,
      queryMonth,
      queryEndYear,
      queryEndMonth,
    ],
    queryFn: () =>
      reportApi.monthly(queryYear, queryMonth, queryEndYear, queryEndMonth),
  });

  const insurance = useQuery<InsurancePerformanceRow[]>({
    queryKey: ["reports", "insurance"],
    queryFn: reportApi.insurancePerformance as any,
  });

  const settlementReport = useQuery<SettlementReportData>({
    queryKey: [
      "reports",
      "settlement",
      reportMode,
      queryYear,
      queryMonth,
      queryEndYear,
      queryEndMonth,
    ],
    queryFn: () =>
      reportApi.settlementReport(
        queryYear,
        queryMonth,
        queryEndYear,
        queryEndMonth
      ) as any,
  });

  const hospitalShare = useQuery({
    queryKey: [
      "reports",
      "hospital-share",
      reportMode,
      queryYear,
      queryMonth,
      queryEndYear,
      queryEndMonth,
    ],
    queryFn: () =>
      reportApi.hospitalShareReport(
        queryYear,
        queryMonth,
        queryEndYear,
        queryEndMonth
      ),
  });

  const patient = useQuery<ReportSummaryRow[]>({
    queryKey: ["reports", "patient", patientId],
    enabled: patientId.length > 0,
    queryFn: () => reportApi.patientClaims(patientId) as any,
  });

  const patientsQuery = useQuery({
    queryKey: ["patients"],
    queryFn: () => patientApi.list({ limit: 100 }),
  });

  const doctorsQuery = useQuery({
    queryKey: ["doctors"],
    queryFn: () => doctorApi.list({ limit: 100 }),
  });

  const departmentsQuery = useQuery({
    queryKey: ["departments"],
    queryFn: () => departmentApi.list({ limit: 100 }),
  });

  // Derived Maps
  const patientMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of patientsQuery.data?.data ?? []) {
      map.set(p._id, p.name);
      map.set(p.id, p.name);
      map.set(p.patientId, p.name);
    }
    return map;
  }, [patientsQuery.data]);

  const doctorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of doctorsQuery.data?.data ?? []) {
      map.set(d._id, d.name);
      map.set(d.id, d.name);
    }
    return map;
  }, [doctorsQuery.data]);

  const departmentMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of departmentsQuery.data?.data ?? []) {
      map.set(d._id, d.name);
    }
    return map;
  }, [departmentsQuery.data]);

  // Derived Report Statistics (Memoized to prevent recalculations on every render)
  const monthlyData = monthly.data as any;

  const summary = useMemo<ReportSummaryRow[]>(() => {
    const rawSummary = monthlyData?.summary ?? monthlyData;
    return Array.isArray(rawSummary) ? rawSummary : [];
  }, [monthlyData]);

  const detailedClaims = useMemo<DetailedClaim[]>(() => {
    return Array.isArray(monthlyData?.detailedClaims)
      ? monthlyData.detailedClaims
      : [];
  }, [monthlyData]);

  const totalClaims = useMemo<number>(() => {
    return (
      monthlyData?.totalClaims ??
      summary.reduce((sum, r) => sum + (r.count ?? 0), 0)
    );
  }, [monthlyData, summary]);

  const totalAmount = useMemo<number>(() => {
    return (
      monthlyData?.totalAmount ??
      summary.reduce((sum, r) => sum + (r.totalAmount ?? 0), 0)
    );
  }, [monthlyData, summary]);

  // Export Action Handler
  const handleExportExcel = () => {
    const sData = settlementReport.data;
    exportReportToCSV({
      periodLabel,
      totalClaims,
      totalAmount,
      summary,
      insuranceData: insurance.data ?? [],
      settlements: sData?.settlements ?? [],
      settlementTotals: sData?.totals ?? {
        totalClaimAmount: 0,
        totalApproved: 0,
        totalDeductions: 0,
        totalTds: 0,
        totalHospitalDiscount: 0,
        totalNetPayable: 0,
      },
      settlementCount: sData?.count ?? 0,
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
    });
  };

  return (
    <div className="page-stack">
      <div className="page-title">
        <p className="eyebrow">Audit-ready reporting</p>
        <h1>Reports &amp; PDF Preview</h1>
        <span>
          Formal hospital branding, printable layouts, watermark support and
          signature sections.
        </span>
      </div>

      <ReportFilters
        reportMode={reportMode}
        setReportMode={setReportMode}
        monthlyYear={monthlyYear}
        setMonthlyYear={setMonthlyYear}
        monthlyMonth={monthlyMonth}
        setMonthlyMonth={setMonthlyMonth}
        calendarYear={calendarYear}
        setCalendarYear={setCalendarYear}
        financialYear={financialYear}
        setFinancialYear={setFinancialYear}
        startYear={startYear}
        setStartYear={setStartYear}
        startMonth={startMonth}
        setStartMonth={setStartMonth}
        endYear={endYear}
        setEndYear={setEndYear}
        endMonth={endMonth}
        setEndMonth={setEndMonth}
        patientInput={patientInput}
        setPatientInput={setPatientInput}
        onSearchPatient={setPatientId}
        now={now}
      >
        <div
          style={{ display: "flex", gap: "8px", marginLeft: "auto" }}
          className="no-print"
        >
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => window.print()}
          >
            Export PDF / Print
          </button>
          <button
            className="btn btn-success"
            type="button"
            onClick={handleExportExcel}
            disabled={detailedClaims.length === 0}
          >
            Export as Excel
          </button>
        </div>
      </ReportFilters>

      {monthly.isError && <ErrorPanel error={monthly.error} />}
      {monthly.isLoading && <Skeleton rows={4} />}

      <div className="report-preview">
        <div className="report-watermark">{HOSPITAL_NAME}</div>

        {/* Printable Report Header */}
        <div className="report-header">
          <div>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              {HOSPITAL_NAME}
            </p>
            <h2>Insurance Claims Financial Review</h2>
            <p style={{ marginTop: 4 }}>Period {periodLabel}</p>
          </div>
          <div className="report-meta">
            <div>Page 1</div>
            <div>Generated {new Date().toLocaleString("en-IN")}</div>
          </div>
        </div>

        {/* Claims KPI and Status Summaries */}
        <ClaimsSummary
          totalClaims={totalClaims}
          totalAmount={totalAmount}
          periodShortLabel={periodShortLabel}
          periodLabel={periodLabel}
          summary={summary}
          isLoading={monthly.isLoading}
          formatCurrency={formatCurrency}
          labelize={labelize}
        />

        {/* Detailed Claims list with column visibility settings */}
        <DetailedClaimsTable
          detailedClaims={detailedClaims}
          visibleColumns={visibleColumns}
          setVisibleColumns={setVisibleColumns}
          patientMap={patientMap}
          doctorMap={doctorMap}
          departmentMap={departmentMap}
          formatCurrency={formatCurrency}
          labelize={labelize}
        />

        {/* Insurance Performance section */}
        <InsurancePerformanceTable
          insuranceData={insurance.data ?? []}
          isLoading={insurance.isLoading}
          formatCurrency={formatCurrency}
        />

        {/* Settlement Financial Review section */}
        <SettlementReviewTable
          settlementData={settlementReport.data}
          isLoading={settlementReport.isLoading}
          formatCurrency={formatCurrency}
          labelize={labelize}
        />

        {/* Hospital Share & Vendor Payout section */}
        <HospitalShareTable
          data={hospitalShare.data}
          isLoading={hospitalShare.isLoading}
          formatCurrency={formatCurrency}
        />

        {/* Patient claim breakdown search results (if requested) */}
        {patient.isLoading && patientId && <Skeleton rows={3} />}
        {patient.isError && <ErrorPanel error={patient.error} />}
        {patient.data && patient.data.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3
              style={{
                fontSize: 13,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--accent-primary)",
                marginBottom: 12,
              }}
            >
              Patient Claim Summary — {patientId}
            </h3>
            <div className="report-summary">
              {patient.data.map((row: any) => (
                <div
                  className="report-summary-cell"
                  key={row._id ?? row.status}
                >
                  <span>{labelize(row._id ?? row.status)}</span>
                  <strong>{row.count ?? 0}</strong>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    {formatCurrency(row.totalAmount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Document Footer / Signatures */}
        <div className="report-footer">
          <span>
            Prepared for administration, insurers, auditors and financial
            review.
          </span>
          <span>Authorized signature: __________________</span>
        </div>
      </div>
    </div>
  );
}
