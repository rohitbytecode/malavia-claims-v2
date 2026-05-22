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

export function ReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
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

  const visibleColumnCount = useMemo(() => {
    return Object.values(visibleColumns).filter(Boolean).length;
  }, [visibleColumns]);

  const monthly = useQuery({
    queryKey: ["reports", "monthly", year, month],
    queryFn: () => reportApi.monthly(year, month),
  });

  const insurance = useQuery({
    queryKey: ["reports", "insurance"],
    queryFn: reportApi.insurancePerformance,
  });

  const settlementReport = useQuery({
    queryKey: ["reports", "settlement", year, month],
    queryFn: () => reportApi.settlementReport(year, month),
  });

  const patient = useQuery({
    queryKey: ["reports", "patient", patientId],
    enabled: patientId.length > 0,
    queryFn: () => reportApi.patientClaims(patientId),
  });

  const monthlyData = monthly.data as any;

  const summary = Array.isArray(monthlyData?.summary)
    ? monthlyData.summary
    : Array.isArray(monthlyData)
      ? monthlyData
      : [];

  const detailedClaims = Array.isArray(monthlyData?.detailedClaims)
    ? monthlyData.detailedClaims
    : [];

  const totalClaims =
    monthlyData?.totalClaims ??
    summary.reduce((sum: number, r: any) => sum + (r.count ?? 0), 0);

  const totalAmount =
    monthlyData?.totalAmount ??
    summary.reduce((sum: number, r: any) => sum + (r.totalAmount ?? 0), 0);

  const patientsQuery = useQuery({
    queryKey: ["patients"],
    queryFn: () => patientApi.list({ limit: 100 }),
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

  const doctorsQuery = useQuery({
    queryKey: ["doctors"],
    queryFn: () => doctorApi.list({ limit: 100 }),
  });

  const doctorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of doctorsQuery.data?.data ?? []) {
      map.set(d._id, d.name);
      map.set(d.id, d.name);
    }
    return map;
  }, [doctorsQuery.data]);

  const departmentsQuery = useQuery({
    queryKey: ["departments"],
    queryFn: () => departmentApi.list({ limit: 100 }),
  });

  const departmentMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of departmentsQuery.data?.data ?? []) {
      map.set(d._id, d.name);
    }
    return map;
  }, [departmentsQuery.data]);

  const handleExportExcel = () => {
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

    const rows = detailedClaims.map((claim: any) => {
      return activeCols
        .map((col) => {
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
        })
        .join(",");
    });

    const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `detailed_claims_${year}_${month.toString().padStart(2, "0")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

      <section className="filter-bar" style={{ gap: 10, flexWrap: "wrap" }}>
        <label
          className="field"
          style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <span
            style={{
              whiteSpace: "nowrap",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text-tertiary)",
            }}
          >
            Year
          </span>
          <input
            className="input"
            type="number"
            style={{ width: 90 }}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </label>

        <label
          className="field"
          style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <span
            style={{
              whiteSpace: "nowrap",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text-tertiary)",
            }}
          >
            Month
          </span>
          <input
            className="input"
            type="number"
            min={1}
            max={12}
            style={{ width: 70 }}
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          />
        </label>

        <div style={{ display: "flex", gap: 8, flex: 1, minWidth: 240 }}>
          <input
            className="input"
            placeholder="Patient ID for summary"
            value={patientInput}
            onChange={(e) => setPatientInput(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && setPatientId(patientInput.trim())
            }
          />
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setPatientId(patientInput.trim())}
          >
            Search
          </button>
        </div>

        <div style={{ display: "flex", gap: "8px" }} className="no-print">
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
      </section>

      {monthly.isError && <ErrorPanel error={monthly.error} />}
      {monthly.isLoading && <Skeleton rows={4} />}

      <div className="report-preview">
        <div className="report-watermark">Malavia Hospital</div>

        {/* Report Header */}
        <div className="report-header">
          <div>
            <p
              style={{
                fontSize: 12,
                color: "#64748b",
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Malavia Hospital
            </p>
            <h2>Insurance Claims Financial Review</h2>
            <p style={{ marginTop: 4 }}>
              Period{" "}
              {new Date(year, month - 1).toLocaleString("en-IN", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="report-meta">
            <div>Page 1</div>
            <div>Generated {new Date().toLocaleString("en-IN")}</div>
          </div>
        </div>

        {/* KPI Strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
            marginBottom: 28,
          }}
        >
          <div className="report-summary-cell">
            <span>Total Claims</span>
            <strong style={{ color: "#1a3a8f" }}>{totalClaims}</strong>
          </div>
          <div className="report-summary-cell">
            <span>Total Amount</span>
            <strong style={{ color: "#1a3a8f" }}>
              {formatCurrency(totalAmount)}
            </strong>
          </div>
          <div className="report-summary-cell">
            <span>Report Period</span>
            <strong style={{ fontSize: 14 }}>
              {month.toString().padStart(2, "0")}/{year}
            </strong>
          </div>
          <div className="report-summary-cell">
            <span>Status Breakdown</span>
            <strong style={{ fontSize: 14 }}>{summary.length} statuses</strong>
          </div>
        </div>

        {/* Monthly Status Breakdown */}
        {summary.length > 0 && (
          <>
            <h3
              style={{
                fontSize: 13,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#1a3a8f",
                marginBottom: 12,
              }}
            >
              Claims by Status — {month}/{year}
            </h3>
            <div className="report-summary" style={{ marginBottom: 28 }}>
              {summary.map((row: any) => (
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
          </>
        )}

        {summary.length === 0 && !monthly.isLoading && (
          <div
            style={{
              padding: "24px 0",
              textAlign: "center",
              color: "#94a3b8",
              fontSize: 13,
            }}
          >
            No claims found for {month}/{year}
          </div>
        )}

        {/* === NEW: Detailed Claims Table === */}
        {detailedClaims.length > 0 && (
          <>
            <h3
              style={{
                fontSize: 13,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#1a3a8f",
                margin: "32px 0 12px",
              }}
            >
              Detailed Claims — {month.toString().padStart(2, "0")}/{year}
            </h3>

            <div
              className="no-print"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px 12px",
                padding: "12px 16px",
                background: "var(--surface-1)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-xl)",
                marginBottom: "18px",
                alignItems: "center",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--text-tertiary)",
                  marginRight: "6px",
                  fontFamily: "var(--font-mono)",
                }}
              >
                Toggle Columns:
              </span>
              {[
                { key: "claimNo", label: "Claim No." },
                { key: "patientId", label: "Patient ID" },
                { key: "patientName", label: "Patient name" },
                { key: "doctorName", label: "Doctor name" },
                { key: "department", label: "department" },
                { key: "type", label: "Type" },
                { key: "status", label: "Status" },
                { key: "claimAmount", label: "Claim amount" },
                { key: "deposit", label: "deposit" },
              ].map((col) => (
                <label
                  key={col.key}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: visibleColumns[col.key]
                      ? "var(--text-primary)"
                      : "var(--text-tertiary)",
                    cursor: "pointer",
                    padding: "4px 10px",
                    borderRadius: "20px",
                    background: visibleColumns[col.key]
                      ? "color-mix(in srgb, var(--accent-primary) 12%, transparent)"
                      : "transparent",
                    border: "1px solid",
                    borderColor: visibleColumns[col.key]
                      ? "color-mix(in srgb, var(--accent-primary) 30%, transparent)"
                      : "var(--border)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={visibleColumns[col.key]}
                    onChange={(e) =>
                      setVisibleColumns((prev) => ({
                        ...prev,
                        [col.key]: e.target.checked,
                      }))
                    }
                    style={{
                      accentColor: "var(--accent-primary)",
                      cursor: "pointer",
                      width: "14px",
                      height: "14px",
                    }}
                  />
                  {col.label}
                </label>
              ))}
            </div>

            <div className="report-table-wrapper" style={{ overflowX: "auto", marginBottom: 32 }}>
              <table
                className="report-table"
                style={{ "--visible-cols": visibleColumnCount } as React.CSSProperties}
              >
                <thead>
                  <tr>
                    {visibleColumns.claimNo && <th>Claim No.</th>}
                    {visibleColumns.patientId && <th>Patient ID</th>}
                    {visibleColumns.patientName && <th>Patient name</th>}
                    {visibleColumns.doctorName && <th>Doctor name</th>}
                    {visibleColumns.department && <th>department</th>}
                    {visibleColumns.type && <th>Type</th>}
                    {visibleColumns.status && <th>Status</th>}
                    {visibleColumns.claimAmount && <th>Claim amount</th>}
                    {visibleColumns.deposit && <th>deposit</th>}
                  </tr>
                </thead>
                <tbody>
                  {detailedClaims.map((claim: any) => (
                    <tr key={claim.claimId}>
                      {visibleColumns.claimNo && (
                        <td>
                          {claim.claimNumber ||
                            claim.claimId?.toString().slice(-8)}
                        </td>
                      )}
                      {visibleColumns.patientId && <td>{claim.patientId}</td>}
                      {visibleColumns.patientName && (
                        <td>
                          {patientMap.get(claim.patientId) ??
                            claim.patientName?.trim() ??
                            "Unknown"}
                        </td>
                      )}
                      {visibleColumns.doctorName && (
                        <td>
                          {doctorMap.get(claim.doctorId)
                            ? `Dr. ${doctorMap.get(claim.doctorId)}`
                            : typeof claim.doctor === "object" &&
                                claim.doctor?.name
                              ? `Dr. ${claim.doctor.name}`
                              : "—"}
                        </td>
                      )}
                      {visibleColumns.department && (
                        <td>
                          {departmentMap.get(claim.departmentId)
                            ? departmentMap.get(claim.departmentId)
                            : typeof claim.department === "object" &&
                                claim.department?.name
                              ? claim.department.name
                              : "—"}
                        </td>
                      )}
                      {visibleColumns.type && <td>{claim.type || "—"}</td>}
                      {visibleColumns.status && (
                        <td>
                          <span
                            className={`status-badge ${claim.status?.toLowerCase() || ""}`}
                          >
                            {labelize(claim.status)}
                          </span>
                        </td>
                      )}
                      {visibleColumns.claimAmount && (
                        <td style={{ fontWeight: 600, textAlign: "right" }}>
                          {formatCurrency(claim.totalClaimAmount)}
                        </td>
                      )}
                      {visibleColumns.deposit && (
                        <td style={{ textAlign: "right" }}>
                          {formatCurrency(claim.depositAmount || 0)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Insurance Performance */}
        <h3
          style={{
            fontSize: 13,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#1a3a8f",
            marginBottom: 12,
          }}
        >
          Insurance Company Performance
        </h3>
        <table className="report-table" style={{ marginBottom: 28 }}>
          {/* ... (your existing insurance table - unchanged) */}
          <thead>
            <tr>
              <th>Insurance company</th>
              <th>Total claims</th>
              <th>Claim amount</th>
              <th>Settled</th>
              <th>Settlement ratio</th>
            </tr>
          </thead>
          <tbody>
            {insurance.isLoading && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    padding: "16px",
                    color: "#94a3b8",
                  }}
                >
                  Loading…
                </td>
              </tr>
            )}
            {insurance.data?.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    padding: "16px",
                    color: "#94a3b8",
                  }}
                >
                  No insurance performance data available
                </td>
              </tr>
            )}
            {insurance.data?.map((row: any) => (
              <tr key={row.companyName}>
                <td>{row.companyName}</td>
                <td>{row.totalClaims}</td>
                <td>{formatCurrency(row.totalClaimAmount)}</td>
                <td>{row.settledClaims}</td>
                <td>{Math.round(row.settlementRatio ?? 0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* === Settlement Financial Review === */}
        <h3
          style={{
            fontSize: 13,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#1a3a8f",
            margin: "32px 0 12px",
          }}
        >
          Settlement Financial Review — {month.toString().padStart(2, "0")}/
          {year}
        </h3>

        {settlementReport.isLoading && <Skeleton rows={3} />}
        {settlementReport.isError && (
          <ErrorPanel error={settlementReport.error} />
        )}

        {(() => {
          const sData = settlementReport.data as any;
          const settlements = sData?.settlements ?? [];
          const totals = sData?.totals ?? {};

          if (!settlementReport.isLoading && settlements.length === 0) {
            return (
              <div
                style={{
                  padding: "24px 0",
                  textAlign: "center",
                  color: "#94a3b8",
                  fontSize: 13,
                }}
              >
                No settlements found for {month}/{year}
              </div>
            );
          }

          if (settlements.length === 0) return null;

          return (
            <>
              {/* Settlement KPI Strip */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div className="report-summary-cell">
                  <span>Settlements</span>
                  <strong style={{ color: "#1a3a8f" }}>
                    {sData?.count ?? 0}
                  </strong>
                </div>
                <div className="report-summary-cell">
                  <span>Approved</span>
                  <strong style={{ color: "#1a3a8f", fontSize: 16 }}>
                    {formatCurrency(totals.totalApproved)}
                  </strong>
                </div>
                <div className="report-summary-cell">
                  <span>Deductions</span>
                  <strong style={{ color: "#dc2626", fontSize: 16 }}>
                    {formatCurrency(totals.totalDeductions)}
                  </strong>
                </div>
                <div className="report-summary-cell">
                  <span>TDS</span>
                  <strong style={{ color: "#dc2626", fontSize: 16 }}>
                    {formatCurrency(totals.totalTds)}
                  </strong>
                </div>
                <div className="report-summary-cell">
                  <span>Hospital Discount</span>
                  <strong style={{ color: "#f59e0b", fontSize: 16 }}>
                    {formatCurrency(totals.totalHospitalDiscount)}
                  </strong>
                </div>
                <div className="report-summary-cell">
                  <span>Net Payable</span>
                  <strong style={{ color: "#059669", fontSize: 16 }}>
                    {formatCurrency(totals.totalNetPayable)}
                  </strong>
                </div>
              </div>

              {/* Settlement Detail Table */}
              <div
                className="report-table-wrapper"
                style={{ overflowX: "auto", marginBottom: 32 }}
              >
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Claim No.</th>
                      <th>Patient ID</th>
                      <th>Insurance Company</th>
                      <th>Claim Amount</th>
                      <th>Approved</th>
                      <th>Deductions</th>
                      <th>TDS</th>
                      <th>Hospital Discount</th>
                      <th>Net Payable</th>
                      <th>Method</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlements.map((s: any) => (
                      <tr key={s._id}>
                        <td>{s.claimNumber || "—"}</td>
                        <td>{s.patientId || "—"}</td>
                        <td>{s.insuranceCompany || "—"}</td>
                        <td style={{ textAlign: "right" }}>
                          {formatCurrency(s.totalClaimAmount)}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 600 }}>
                          {formatCurrency(s.approvedAmount)}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            color: s.deductions > 0 ? "#dc2626" : undefined,
                          }}
                        >
                          {formatCurrency(s.deductions)}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            color: s.tds > 0 ? "#dc2626" : undefined,
                          }}
                        >
                          {formatCurrency(s.tds)}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            color:
                              s.hospitalDiscount > 0 ? "#f59e0b" : undefined,
                          }}
                        >
                          {formatCurrency(s.hospitalDiscount)}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: 700,
                            color: "#059669",
                          }}
                        >
                          {formatCurrency(s.netPayable)}
                        </td>
                        <td>{labelize(s.settlementMethod)}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {s.settlementDate
                            ? new Date(s.settlementDate).toLocaleDateString(
                                "en-IN"
                              )
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr
                      style={{
                        fontWeight: 700,
                        background: "#eef2ff",
                        borderTop: "2px solid #c7d2fe",
                      }}
                    >
                      <td colSpan={3} style={{ textAlign: "right" }}>
                        TOTALS
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {formatCurrency(totals.totalClaimAmount)}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {formatCurrency(totals.totalApproved)}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          color: "#dc2626",
                        }}
                      >
                        {formatCurrency(totals.totalDeductions)}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          color: "#dc2626",
                        }}
                      >
                        {formatCurrency(totals.totalTds)}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          color: "#f59e0b",
                        }}
                      >
                        {formatCurrency(totals.totalHospitalDiscount)}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          color: "#059669",
                        }}
                      >
                        {formatCurrency(totals.totalNetPayable)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          );
        })()}

        {/* Patient Summary - unchanged */}
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
                color: "#1a3a8f",
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

        {/* Footer */}
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
