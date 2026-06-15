import { useState, useMemo, useEffect } from "react";
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
import { useAuthStore } from "../../store/auth.store";

// Sub-components
import { ReportFilters } from "./components/ReportFilters";
import { ClaimsSummary } from "./components/ClaimsSummary";
import { DetailedClaimsTable } from "./components/DetailedClaimsTable";
import { DepartmentReportTable } from "./components/DepartmentReportTable";
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
  { id: "claims-summary", label: "Claims Summary" },
  { id: "detailed-claims", label: "Detailed Claims" },
  { id: "department-report", label: "Department-wise Report" },
  { id: "insurance-performance", label: "Insurance Company Performance" },
  { id: "settlement-review", label: "Settlement Financial Review" },
  { id: "hospital-share", label: "Hospital Share & Vendor Payout" },
] as const;

type TabId = (typeof REPORT_TABS)[number]["id"];

function buildPrintStyle(activeTab: TabId): string {
  return REPORT_TABS.map(({ id }) =>
    id !== activeTab
      ? `@media print { [data-report-tab="${id}"] { display: none !important; } }`
      : ""
  ).join("\n");
}

function ReportGeneratedTime() {
  const [time, setTime] = useState("");
  useEffect(() => {
    setTime(new Date().toLocaleString("en-IN"));
  }, []);
  return <div>{time ? `Generated ${time}` : ""}</div>;
}

export function ReportsPage() {
  const now = new Date();
  const user = useAuthStore((s) => s.user);
  const isPharmacist = user?.role === "PHARMACIST";

  const [activeTab, setActiveTab] = useState<TabId>("claims-summary");

  const [reportMode, setReportMode] = useState<
    "monthly" | "calendar" | "financial" | "custom"
  >("monthly");
  const [monthlyYear, setMonthlyYear] = useState(() =>
    new Date().getFullYear()
  );
  const [monthlyMonth, setMonthlyMonth] = useState(
    () => new Date().getMonth() + 1
  );
  const [calendarYear, setCalendarYear] = useState(() =>
    new Date().getFullYear()
  );

  const defaultFinancialYear =
    now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
  const [financialYear, setFinancialYear] = useState(defaultFinancialYear);

  const [startYear, setStartYear] = useState(() => new Date().getFullYear());
  const [startMonth, setStartMonth] = useState(() => new Date().getMonth() + 1);
  const [endYear, setEndYear] = useState(() => new Date().getFullYear());
  const [endMonth, setEndMonth] = useState(() => new Date().getMonth() + 1);

  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");

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
    queryKey: ["reports", "patient", appliedSearchTerm],
    enabled: appliedSearchTerm.length > 0,
    queryFn: () => reportApi.patientClaims(appliedSearchTerm) as any,
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

  const filteredDetailedClaims = useMemo<DetailedClaim[]>(() => {
    const claims = Array.isArray(monthlyData?.detailedClaims)
      ? monthlyData.detailedClaims
      : [];
    if (!appliedSearchTerm) return claims;
    const term = appliedSearchTerm.toLowerCase().trim();
    return claims.filter((claim: DetailedClaim) => {
      const pName = (
        patientMap.get(claim.patientId) ||
        claim.patientName ||
        ""
      ).toLowerCase();
      const dName = (
        doctorMap.get(claim.doctorId) ||
        (typeof claim.doctor === "object" && claim.doctor?.name) ||
        ""
      ).toLowerCase();
      const deptName = (
        departmentMap.get(claim.departmentId) ||
        (typeof claim.department === "object" && claim.department?.name) ||
        ""
      ).toLowerCase();
      return (
        claim.claimNumber?.toLowerCase().includes(term) ||
        claim.claimId?.toLowerCase().includes(term) ||
        claim.patientId?.toLowerCase().includes(term) ||
        pName.includes(term) ||
        dName.includes(term) ||
        deptName.includes(term) ||
        claim.type?.toLowerCase().includes(term) ||
        claim.status?.toLowerCase().includes(term)
      );
    });
  }, [
    monthlyData?.detailedClaims,
    appliedSearchTerm,
    patientMap,
    doctorMap,
    departmentMap,
  ]);

  const summary = useMemo<ReportSummaryRow[]>(() => {
    if (!appliedSearchTerm) {
      const rawSummary = monthlyData?.summary ?? monthlyData;
      return Array.isArray(rawSummary) ? rawSummary : [];
    }
    const statusMap = new Map<string, { count: number; totalAmount: number }>();
    for (const claim of filteredDetailedClaims) {
      const status = claim.status || "UNKNOWN";
      const current = statusMap.get(status) || { count: 0, totalAmount: 0 };
      current.count += 1;
      current.totalAmount +=
        claim.status === "SETTLED" &&
        claim.settledAmount !== null &&
        claim.settledAmount !== undefined
          ? claim.settledAmount
          : claim.totalClaimAmount || 0;
      statusMap.set(status, current);
    }
    return Array.from(statusMap.entries()).map(([status, val]) => ({
      _id: status,
      count: val.count,
      totalAmount: val.totalAmount,
    }));
  }, [monthlyData, filteredDetailedClaims, appliedSearchTerm]);

  const detailedClaims = filteredDetailedClaims;

  const totalClaims = useMemo<number>(() => {
    return detailedClaims.length;
  }, [detailedClaims]);

  const totalAmount = useMemo<number>(() => {
    return detailedClaims.reduce(
      (sum: number, r: DetailedClaim) =>
        sum +
        (r.status === "SETTLED" &&
        r.settledAmount !== null &&
        r.settledAmount !== undefined
          ? r.settledAmount
          : (r.totalClaimAmount ?? 0)),
      0
    );
  }, [detailedClaims]);

  const sData = settlementReport.data;

  const filteredSettlements = useMemo(() => {
    const list = sData?.settlements || [];
    if (!appliedSearchTerm) return list;
    const term = appliedSearchTerm.toLowerCase().trim();
    return list.filter((s: any) => {
      const pName = (patientMap.get(s.patientId) || "").toLowerCase();
      const deptName = (departmentMap.get(s.departmentId) || "").toLowerCase();
      return (
        s.claimNumber?.toLowerCase().includes(term) ||
        s.claimId?.toLowerCase().includes(term) ||
        s.patientId?.toLowerCase().includes(term) ||
        pName.includes(term) ||
        deptName.includes(term) ||
        s.insuranceCompany?.toLowerCase().includes(term) ||
        s.settlementMethod?.toLowerCase().includes(term)
      );
    });
  }, [sData?.settlements, appliedSearchTerm, patientMap, departmentMap]);

  const filteredSettlementTotals = useMemo(() => {
    return filteredSettlements.reduce(
      (acc: any, s: any) => {
        acc.totalApproved += s.approvedAmount || 0;
        acc.totalDeductions += s.deductions || 0;
        acc.totalTds += s.tds || 0;
        acc.totalHospitalDiscount += s.hospitalDiscount || 0;
        acc.totalNetPayable += s.netPayable || 0;
        acc.totalClaimAmount += s.totalClaimAmount || 0;
        return acc;
      },
      {
        totalApproved: 0,
        totalDeductions: 0,
        totalTds: 0,
        totalHospitalDiscount: 0,
        totalNetPayable: 0,
        totalClaimAmount: 0,
      }
    );
  }, [filteredSettlements]);

  const filteredHospitalShareRows = useMemo(() => {
    const list = hospitalShare.data?.rows || [];
    if (!appliedSearchTerm) return list;
    const term = appliedSearchTerm.toLowerCase().trim();
    return list.filter((r: any) => {
      return (
        r.claimNumber?.toLowerCase().includes(term) ||
        r.claimId?.toLowerCase().includes(term) ||
        r.insuranceCompany?.toLowerCase().includes(term)
      );
    });
  }, [hospitalShare.data?.rows, appliedSearchTerm]);

  const filteredHospitalShareTotals = useMemo(() => {
    return filteredHospitalShareRows.reduce(
      (acc: any, r: any) => {
        acc.totalApproved += r.approvedAmount || 0;
        acc.totalNetPayable += r.netPayable || 0;
        acc.totalPharmacyShare += r.pharmacyShare || 0;
        acc.totalLabShare += r.labShare || 0;
        acc.totalRadiologyShare += r.radiologyShare || 0;
        acc.totalVendorPayout += r.vendorPayout || 0;
        acc.totalHospitalShare += r.hospitalShare || 0;
        return acc;
      },
      {
        totalApproved: 0,
        totalNetPayable: 0,
        totalPharmacyShare: 0,
        totalLabShare: 0,
        totalRadiologyShare: 0,
        totalVendorPayout: 0,
        totalHospitalShare: 0,
      }
    );
  }, [filteredHospitalShareRows]);

  const filteredInsuranceData = useMemo(() => {
    const list = insurance.data || [];
    if (!appliedSearchTerm) return list;
    const term = appliedSearchTerm.toLowerCase().trim();
    return list.filter((row) => row.companyName?.toLowerCase().includes(term));
  }, [insurance.data, appliedSearchTerm]);

  const departmentReportData = useMemo(() => {
    const list = filteredSettlements;
    const groupsMap = new Map<
      string,
      {
        departmentId: string;
        departmentName: string;
        rows: any[];
        totals: {
          receivedAmount: number;
          deductions: number;
          tds: number;
          pharmacy: number;
          lab: number;
          radiology: number;
          others: number;
          hospitalShareBeforeTds: number;
          hospitalShareAfterTds: number;
        };
      }
    >();

    for (const s of list) {
      const deptId = s.departmentId || "unknown";
      const deptName = departmentMap.get(deptId) || "General / Other";

      let pharmacy = 0;
      let lab = 0;
      let radiology = 0;
      let others = 0;
      let totalVendorPayout = 0;

      for (const item of s.departmentBreakdown || []) {
        const payoutVal =
          item.vendorPayout !== undefined
            ? item.vendorPayout
            : (item.netAmount ?? 0);

        totalVendorPayout += payoutVal;

        if (item.departmentCategory === "PHARMACY") {
          pharmacy = payoutVal;
        } else if (item.departmentCategory === "LABORATORY") {
          lab = payoutVal;
        } else if (item.departmentCategory === "RADIOLOGY") {
          radiology = payoutVal;
        } else {
          others += payoutVal;
        }
      }

      const receivedAmount = (s.netPayable || 0) + (s.tds || 0);
      const hospitalShareAfterTds = Math.max(
        0,
        (s.netPayable || 0) - totalVendorPayout
      );
      const hospitalShareBeforeTds = hospitalShareAfterTds + (s.tds || 0);

      let group = groupsMap.get(deptId);
      if (!group) {
        group = {
          departmentId: deptId,
          departmentName: deptName,
          rows: [],
          totals: {
            receivedAmount: 0,
            deductions: 0,
            tds: 0,
            pharmacy: 0,
            lab: 0,
            radiology: 0,
            others: 0,
            hospitalShareBeforeTds: 0,
            hospitalShareAfterTds: 0,
          },
        };
        groupsMap.set(deptId, group);
      }

      group.rows.push({
        claimId: s.claimId,
        claimNumber: s.claimNumber,
        patientId: s.patientId,
        patientName: patientMap.get(s.patientId) || "Unknown",
        receivedAmount,
        deductions: s.deductions || 0,
        tds: s.tds || 0,
        pharmacy,
        lab,
        radiology,
        others,
        hospitalShareBeforeTds,
        hospitalShareAfterTds,
      });

      group.totals.receivedAmount += receivedAmount;
      group.totals.deductions += s.deductions || 0;
      group.totals.tds += s.tds || 0;
      group.totals.pharmacy += pharmacy;
      group.totals.lab += lab;
      group.totals.radiology += radiology;
      group.totals.others += others;
      group.totals.hospitalShareBeforeTds += hospitalShareBeforeTds;
      group.totals.hospitalShareAfterTds += hospitalShareAfterTds;
    }

    const groups = Array.from(groupsMap.values()).sort((a, b) =>
      a.departmentName.localeCompare(b.departmentName)
    );

    const grandTotals = groups.reduce(
      (acc: any, g: any) => {
        acc.receivedAmount += g.totals.receivedAmount;
        acc.deductions += g.totals.deductions;
        acc.tds += g.totals.tds;
        acc.pharmacy += g.totals.pharmacy;
        acc.lab += g.totals.lab;
        acc.radiology += g.totals.radiology;
        acc.others += g.totals.others;
        acc.hospitalShareBeforeTds += g.totals.hospitalShareBeforeTds;
        acc.hospitalShareAfterTds += g.totals.hospitalShareAfterTds;
        return acc;
      },
      {
        receivedAmount: 0,
        deductions: 0,
        tds: 0,
        pharmacy: 0,
        lab: 0,
        radiology: 0,
        others: 0,
        hospitalShareBeforeTds: 0,
        hospitalShareAfterTds: 0,
      }
    );

    return { groups, grandTotals };
  }, [filteredSettlements, departmentMap, patientMap]);

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

    "detailed-claims":
      detailedClaims.length > 0
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

    "department-report": () =>
      exportReportToCSV({
        ...sharedExportBase,
        insuranceData: [],
        settlements: [],
        settlementTotals: emptySettlementTotals,
        settlementCount: 0,
        detailedClaims: [],
        visibleColumns,
        departmentReportData,
        exportScope: "department-report",
      }),

    "insurance-performance": () =>
      exportReportToCSV({
        ...sharedExportBase,
        insuranceData: filteredInsuranceData,
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
        settlements: filteredSettlements,
        settlementTotals: filteredSettlementTotals,
        settlementCount: filteredSettlements.length,
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
        hospitalShareData: {
          rows: filteredHospitalShareRows,
          totals: filteredHospitalShareTotals,
          count: filteredHospitalShareRows.length,
        },
        exportScope: "hospital-share",
      }),
  };

  const handlePrint = () => {
    let styleEl = document.getElementById(
      "report-print-style"
    ) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "report-print-style";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = buildPrintStyle(activeTab);
    window.print();
  };

  const activeTabLabel =
    REPORT_TABS.find((t) => t.id === activeTab)?.label ?? "";

  if (isPharmacist) {
    const allClaims: DetailedClaim[] = Array.isArray(
      monthlyData?.detailedClaims
    )
      ? monthlyData.detailedClaims
      : [];

    const pharmacyClaims = allClaims.filter((c) =>
      c.billBreakdown?.some((b) => b.departmentCategory === "PHARMACY")
    );

    const pharmacyTotal = pharmacyClaims.reduce(
      (sum, c) =>
        sum +
        (c.billBreakdown?.find((b) => b.departmentCategory === "PHARMACY")
          ?.amount ?? 0),
      0
    );

    const PHARMACY_STATUSES = [
      "PRE_AUTH_APPROVED",
      "PRE_AUTH_PENDING",
      "SETTLEMENT_PENDING",
      "SETTLED",
    ];

    const pharmacySummary: ReportSummaryRow[] = (() => {
      const map = new Map<string, { count: number; totalAmount: number }>(
        PHARMACY_STATUSES.map((s) => [s, { count: 0, totalAmount: 0 }])
      );
      for (const c of pharmacyClaims) {
        const status = PHARMACY_STATUSES.includes(c.status) ? c.status : null;
        if (!status) continue;
        const amount =
          c.billBreakdown?.find((b) => b.departmentCategory === "PHARMACY")
            ?.amount ??
          c.totalClaimAmount ??
          0;
        const cur = map.get(status)!;
        cur.count += 1;
        cur.totalAmount += amount;
      }
      return Array.from(map.entries()).map(([status, val]) => ({
        _id: status,
        count: val.count,
        totalAmount: val.totalAmount,
      }));
    })();

    // Department report: only show pharmacy column, zero out others
    const pharmacyDepartmentData = {
      groups: departmentReportData.groups.map((g) => ({
        ...g,
        rows: g.rows.map((r) => ({
          ...r,
          approvedAmount: r.pharmacy,
          deductions: 0,
          tds: 0,
          lab: 0,
          radiology: 0,
          others: 0,
          netPayable: r.pharmacy,
        })),
        totals: {
          ...g.totals,
          approvedAmount: g.totals.pharmacy,
          deductions: 0,
          tds: 0,
          lab: 0,
          radiology: 0,
          others: 0,
          netPayable: g.totals.pharmacy,
        },
      })),
      grandTotals: {
        ...departmentReportData.grandTotals,
        approvedAmount: departmentReportData.grandTotals.pharmacy,
        deductions: 0,
        tds: 0,
        lab: 0,
        radiology: 0,
        others: 0,
        netPayable: departmentReportData.grandTotals.pharmacy,
      },
    };

    const PHARMACIST_TABS = [
      { id: "claims-summary", label: "Claims Summary" },
      { id: "detailed-claims", label: "Detailed Claims" },
      { id: "department-report", label: "Department-wise Report" },
      { id: "hospital-share", label: "Pharmacy Payout" },
    ] as const;

    const pharmacyAmountMap = useMemo(() => {
      const map = new Map<string, number>();
      for (const c of allClaims) {
        const amt =
          c.billBreakdown?.find((b) => b.departmentCategory === "PHARMACY")
            ?.amount ?? 0;
        map.set(c.claimId, amt);
      }
      return map;
    }, [allClaims]);

    return (
      <div className="page-stack">
        <div className="page-title">
          <p className="eyebrow">Pharmacy reporting</p>
          <h1>Reports &amp; PDF Preview</h1>
          <span>Pharmacy bill data for the selected period.</span>
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
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={setAppliedSearchTerm}
          now={now}
        />

        <div className="report-tabs no-print" role="tablist">
          {PHARMACIST_TABS.map((tab) => (
            <button
              type="button"
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`report-tab-btn${activeTab === tab.id ? " report-tab-btn--active" : ""}`}
              onClick={() => setActiveTab(tab.id as TabId)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {monthly.isLoading && <Skeleton rows={4} />}
        {monthly.isError && <ErrorPanel error={monthly.error} />}

        {!monthly.isLoading && (
          <div className="report-preview">
            <div className="report-watermark">{HOSPITAL_NAME}</div>

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
                <h2>Pharmacy Claims Report</h2>
                <p style={{ marginTop: 4 }}>Period: {periodLabel}</p>
              </div>
              <div className="report-meta">
                <div>Page 1</div>
                <ReportGeneratedTime />
              </div>
            </div>

            <div
              className="report-tab-actions no-print"
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                marginBottom: 16,
              }}
            >
              <button
                className="btn btn-primary"
                type="button"
                onClick={handlePrint}
              >
                Export PDF / Print
              </button>
              <button
                className="btn btn-success"
                type="button"
                onClick={() =>
                  exportReportToCSV({
                    ...sharedExportBase,
                    insuranceData: [],
                    settlements: [],
                    settlementTotals: emptySettlementTotals,
                    settlementCount: 0,
                    detailedClaims: pharmacyClaims,
                    visibleColumns,
                    exportScope: "detailed-claims",
                  })
                }
              >
                Export as Excel
              </button>
            </div>

            {activeTab === "claims-summary" && (
              <ClaimsSummary
                totalClaims={pharmacyClaims.length}
                totalAmount={pharmacyTotal}
                periodShortLabel={periodShortLabel}
                periodLabel={periodLabel}
                summary={pharmacySummary}
                isLoading={monthly.isLoading}
                formatCurrency={formatCurrency}
                labelize={labelize}
                amountLabel="Total Pharmacy Amount"
              />
            )}

            {activeTab === "detailed-claims" && (
              <DetailedClaimsTable
                detailedClaims={pharmacyClaims}
                visibleColumns={{
                  claimNo: true,
                  patientId: true,
                  patientName: true,
                  status: true,
                  type: true,
                  claimAmount: true,
                  deposit: false,
                  doctorName: false,
                  department: false,
                }}
                pharmacyAmountMap={pharmacyAmountMap}
                setVisibleColumns={() => {}}
                patientMap={patientMap}
                doctorMap={doctorMap}
                departmentMap={departmentMap}
                formatCurrency={formatCurrency}
                labelize={labelize}
              />
            )}

            {activeTab === "department-report" && (
              <DepartmentReportTable
                groups={pharmacyDepartmentData.groups}
                grandTotals={pharmacyDepartmentData.grandTotals}
                isLoading={settlementReport.isLoading}
                formatCurrency={formatCurrency}
              />
            )}

            {activeTab === "hospital-share" && (
              <HospitalShareTable
                data={{
                  rows: filteredHospitalShareRows,
                  totals: filteredHospitalShareTotals,
                  count: filteredHospitalShareRows.length,
                }}
                isLoading={hospitalShare.isLoading}
                formatCurrency={formatCurrency}
                role={user?.role}
              />
            )}

            <div className="report-footer">
              <span>
                Pharmacy billing report — for internal reference only.
              </span>
              <span>Authorized signature: __________________</span>
            </div>
          </div>
        )}
      </div>
    );
  }

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
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={setAppliedSearchTerm}
        now={now}
      />

      {/* ── Tab navigation ── */}
      <div
        className="report-tabs no-print"
        role="tablist"
        aria-label="Report sections"
      >
        {REPORT_TABS.map((tab) => (
          <button
            type="button"
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            className={`report-tab-btn${activeTab === tab.id ? " report-tab-btn--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
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
            <h2>{activeTabLabel}</h2>
            <p style={{ marginTop: 4 }}>Period: {periodLabel}</p>
          </div>
          <div className="report-meta">
            <div>Page 1</div>
            <ReportGeneratedTime />
          </div>
        </div>

        {/* ── Per-tab action bar ── */}
        <div
          className="report-tab-actions no-print"
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            marginBottom: 16,
          }}
        >
          <button
            className="btn btn-primary"
            type="button"
            onClick={handlePrint}
          >
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

          {patient.isLoading && appliedSearchTerm && <Skeleton rows={3} />}
          {patient.isError && <ErrorPanel error={patient.error} />}
          {patient.data && patient.data.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--accent-primary)",
                  marginBottom: 12,
                }}
              >
                Patient Claim Summary - {appliedSearchTerm}
              </h3>
              <div className="report-summary">
                {patient.data.map((row: any) => (
                  <div
                    className="report-summary-cell"
                    key={row._id ?? row.status}
                  >
                    <span>{labelize(row._id ?? row.status)}</span>
                    <strong>{row.count ?? 0}</strong>
                    <div
                      style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}
                    >
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

        {/* 3. Department-wise Report */}
        <div
          id="tabpanel-department-report"
          role="tabpanel"
          aria-labelledby="tab-department-report"
          data-report-tab="department-report"
          hidden={activeTab !== "department-report"}
        >
          <DepartmentReportTable
            groups={departmentReportData.groups}
            grandTotals={departmentReportData.grandTotals}
            isLoading={settlementReport.isLoading}
            formatCurrency={formatCurrency}
          />
        </div>

        {/* 4. Insurance Company Performance */}
        <div
          id="tabpanel-insurance-performance"
          role="tabpanel"
          aria-labelledby="tab-insurance-performance"
          data-report-tab="insurance-performance"
          hidden={activeTab !== "insurance-performance"}
        >
          <InsurancePerformanceTable
            insuranceData={filteredInsuranceData}
            isLoading={insurance.isLoading}
            formatCurrency={formatCurrency}
          />
        </div>

        {/* 5. Settlement Financial Review */}
        <div
          id="tabpanel-settlement-review"
          role="tabpanel"
          aria-labelledby="tab-settlement-review"
          data-report-tab="settlement-review"
          hidden={activeTab !== "settlement-review"}
        >
          <SettlementReviewTable
            settlementData={{
              settlements: filteredSettlements,
              totals: filteredSettlementTotals,
              count: filteredSettlements.length,
            }}
            isLoading={settlementReport.isLoading}
            formatCurrency={formatCurrency}
            labelize={labelize}
          />
        </div>

        {/* 6. Hospital Share & Vendor Payout */}
        <div
          id="tabpanel-hospital-share"
          role="tabpanel"
          aria-labelledby="tab-hospital-share"
          data-report-tab="hospital-share"
          hidden={activeTab !== "hospital-share"}
        >
          <HospitalShareTable
            data={{
              rows: filteredHospitalShareRows,
              totals: filteredHospitalShareTotals,
              count: filteredHospitalShareRows.length,
            }}
            isLoading={hospitalShare.isLoading}
            formatCurrency={formatCurrency}
            role={user?.role}
          />
        </div>

        {/* Shared printable footer — always visible */}
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

//Helpers

const emptySettlementTotals = {
  totalClaimAmount: 0,
  totalApproved: 0,
  totalDeductions: 0,
  totalTds: 0,
  totalHospitalDiscount: 0,
  totalNetPayable: 0,
};
