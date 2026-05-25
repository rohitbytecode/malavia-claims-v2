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

const REPORT_TABS = [
  { id: "claims-summary",         label: "Claims Summary"},
  { id: "detailed-claims",        label: "Detailed Claims"},
  { id: "insurance-performance",  label: "Insurance Company Performance"},
  { id: "settlement-review",      label: "Settlement Financial Review"},
  { id: "hospital-share",         label: "Hospital Share & Vendor Payout"},
] as const;

type TabId = (typeof REPORT_TABS)[number]["id"];


function buildPrintStyle(activeTab: TabId): string {
  return REPORT_TABS.map(({ id }) =>
    id !== activeTab
      ? `@media print { [data-report-tab="${id}"] { display: none !important; } }`
      : ""
  ).join("\n");
}

export function ReportsPage() {
  const now = new Date();

  const [activeTab, setActiveTab] = useState<TabId>("claims-summary");

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

  const [patientId, setPatientId] = useState("");
  const [patientInput, setPatientInput] = useState("");

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

  const periodLabel = useMemo(() => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
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
  }, [reportMode, monthlyMonth, monthlyYear, calendarYear, financialYear, startMonth, startYear, endMonth, endYear]);

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
  }, [reportMode, monthlyMonth, monthlyYear, calendarYear, financialYear, startMonth, startYear, endMonth, endYear]);

  const monthly = useQuery({
    queryKey: ["reports", "monthly", reportMode, queryYear, queryMonth, queryEndYear, queryEndMonth],
    queryFn: () => reportApi.monthly(queryYear, queryMonth, queryEndYear, queryEndMonth),
  });

  const insurance = useQuery<InsurancePerformanceRow[]>({
    queryKey: ["reports", "insurance"],
    queryFn: reportApi.insurancePerformance as any,
  });

  const settlementReport = useQuery<SettlementReportData>({
    queryKey: ["reports", "settlement", reportMode, queryYear, queryMonth, queryEndYear, queryEndMonth],
    queryFn: () => reportApi.settlementReport(queryYear, queryMonth, queryEndYear, queryEndMonth) as any,
  });

  const hospitalShare = useQuery({
    queryKey: ["reports", "hospital-share", reportMode, queryYear, queryMonth, queryEndYear, queryEndMonth],
    queryFn: () => reportApi.hospitalShareReport(queryYear, queryMonth, queryEndYear, queryEndMonth),
  });

  const patient = useQuery<ReportSummaryRow[]>({
    queryKey: ["reports", "patient", patientId],
    enabled: patientId.length > 0,
    queryFn: () => reportApi.patientClaims(patientId) as any,
  });

  const patientsQuery  = useQuery({ queryKey: ["patients"],    queryFn: () => patientApi.list({ limit: 100 }) });
  const doctorsQuery   = useQuery({ queryKey: ["doctors"],     queryFn: () => doctorApi.list({ limit: 100 }) });
  const departmentsQuery = useQuery({ queryKey: ["departments"], queryFn: () => departmentApi.list({ limit: 100 }) });

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

  const monthlyData = monthly.data as any;

  const summary = useMemo<ReportSummaryRow[]>(() => {
    const rawSummary = monthlyData?.summary ?? monthlyData;
    return Array.isArray(rawSummary) ? rawSummary : [];
  }, [monthlyData]);

  const detailedClaims = useMemo<DetailedClaim[]>(() => {
    return Array.isArray(monthlyData?.detailedClaims) ? monthlyData.detailedClaims : [];
  }, [monthlyData]);

  const totalClaims = useMemo<number>(() => {
    return monthlyData?.totalClaims ?? summary.reduce((sum, r) => sum + (r.count ?? 0), 0);
  }, [monthlyData, summary]);

  const totalAmount = useMemo<number>(() => {
    return monthlyData?.totalAmount ?? summary.reduce((sum, r) => sum + (r.totalAmount ?? 0), 0);
  }, [monthlyData, summary]);

  const sharedExportBase = {
    periodLabel,
    totalClaims,
    totalAmount,
    summary,
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
  } as const;

  const sData = settlementReport.data;

  const exportHandlers: Record<TabId, (() => void) | null> = {
    "claims-summary": () =>
      exportReportToCSV({
        ...sharedExportBase,
        insuranceData: [],
        settlements: [],
        settlementTotals: emptySettlementTotals,
        settlementCount: 0,
        detailedClaims: [],
        visibleColumns,
        exportScope: "claims-summary",
      }),

    "detailed-claims": detailedClaims.length > 0
      ? () =>
          exportReportToCSV({
            ...sharedExportBase,
            insuranceData: [],
            settlements: [],
            settlementTotals: emptySettlementTotals,
            settlementCount: 0,
            detailedClaims,
            visibleColumns,
            exportScope: "detailed-claims",
          })
      : null,

    "insurance-performance": () =>
      exportReportToCSV({
        ...sharedExportBase,
        insuranceData: insurance.data ?? [],
        settlements: [],
        settlementTotals: emptySettlementTotals,
        settlementCount: 0,
        detailedClaims: [],
        visibleColumns,
        exportScope: "insurance-performance",
      }),

    "settlement-review": () =>
      exportReportToCSV({
        ...sharedExportBase,
        insuranceData: [],
        settlements: sData?.settlements ?? [],
        settlementTotals: sData?.totals ?? emptySettlementTotals,
        settlementCount: sData?.count ?? 0,
        detailedClaims: [],
        visibleColumns,
        exportScope: "settlement-review",
      }),

    "hospital-share": () =>
      exportReportToCSV({
        ...sharedExportBase,
        insuranceData: [],
        settlements: [],
        settlementTotals: emptySettlementTotals,
        settlementCount: 0,
        detailedClaims: [],
        visibleColumns,
        hospitalShareData: hospitalShare.data,
        exportScope: "hospital-share",
      }),
  };

  const handlePrint = () => {

    let styleEl = document.getElementById("report-print-style") as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "report-print-style";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = buildPrintStyle(activeTab);
    window.print();
  };

  const activeTabLabel = REPORT_TABS.find((t) => t.id === activeTab)?.label ?? "";

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

      {/* ── Filters (shared across all tabs) ── */}
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
      />

      {/* ── Tab navigation ── */}
      <div className="report-tabs no-print" role="tablist" aria-label="Report sections">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            className={`report-tab-btn${activeTab === tab.id ? " report-tab-btn--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {monthly.isError && <ErrorPanel error={monthly.error} />}
      {monthly.isLoading && <Skeleton rows={4} />}

      {/* ── Report preview wrapper ── */}
      <div className="report-preview">
        <div className="report-watermark">{HOSPITAL_NAME}</div>

        {/* Shared printable header — always visible */}
        <div className="report-header">
          <div>
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 600, marginBottom: 4 }}>
              {HOSPITAL_NAME}
            </p>
            <h2>
              {activeTabLabel}
            </h2>
            <p style={{ marginTop: 4 }}>Period: {periodLabel}</p>
          </div>
          <div className="report-meta">
            <div>Page 1</div>
            <div>Generated {new Date().toLocaleString("en-IN")}</div>
          </div>
        </div>

        {/* ── Per-tab action bar ── */}
        <div
          className="report-tab-actions no-print"
          style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 16 }}
        >
          <button className="btn btn-primary" type="button" onClick={handlePrint}>
            Export PDF / Print
          </button>
          {exportHandlers[activeTab] && (
            <button
              className="btn btn-success"
              type="button"
              onClick={exportHandlers[activeTab]!}
            >
              Export as Excel
            </button>
          )}
        </div>

        {/* ── Tab panels ── */}

        {/* 1. Claims Summary */}
        <div
          id="tabpanel-claims-summary"
          role="tabpanel"
          aria-labelledby="tab-claims-summary"
          data-report-tab="claims-summary"
          hidden={activeTab !== "claims-summary"}
        >
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
                  <div className="report-summary-cell" key={row._id ?? row.status}>
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
        </div>

        {/* 2. Detailed Claims */}
        <div
          id="tabpanel-detailed-claims"
          role="tabpanel"
          aria-labelledby="tab-detailed-claims"
          data-report-tab="detailed-claims"
          hidden={activeTab !== "detailed-claims"}
        >
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
        </div>

        {/* 3. Insurance Company Performance */}
        <div
          id="tabpanel-insurance-performance"
          role="tabpanel"
          aria-labelledby="tab-insurance-performance"
          data-report-tab="insurance-performance"
          hidden={activeTab !== "insurance-performance"}
        >
          <InsurancePerformanceTable
            insuranceData={insurance.data ?? []}
            isLoading={insurance.isLoading}
            formatCurrency={formatCurrency}
          />
        </div>

        {/* 4. Settlement Financial Review */}
        <div
          id="tabpanel-settlement-review"
          role="tabpanel"
          aria-labelledby="tab-settlement-review"
          data-report-tab="settlement-review"
          hidden={activeTab !== "settlement-review"}
        >
          <SettlementReviewTable
            settlementData={settlementReport.data}
            isLoading={settlementReport.isLoading}
            formatCurrency={formatCurrency}
            labelize={labelize}
          />
        </div>

        {/* 5. Hospital Share & Vendor Payout */}
        <div
          id="tabpanel-hospital-share"
          role="tabpanel"
          aria-labelledby="tab-hospital-share"
          data-report-tab="hospital-share"
          hidden={activeTab !== "hospital-share"}
        >
          <HospitalShareTable
            data={hospitalShare.data}
            isLoading={hospitalShare.isLoading}
            formatCurrency={formatCurrency}
          />
        </div>

        {/* Shared printable footer — always visible */}
        <div className="report-footer">
          <span>Prepared for administration, insurers, auditors and financial review.</span>
          <span>Authorized signature: __________________</span>
        </div>
      </div>
    </div>
  );
}

//Helpers

const emptySettlementTotals = {
  totalClaimAmount: 0,
  totalApproved: 0,
  totalDeductions: 0,
  totalTds: 0,
  totalHospitalDiscount: 0,
  totalNetPayable: 0,
};