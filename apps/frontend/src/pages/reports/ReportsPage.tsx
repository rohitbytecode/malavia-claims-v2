import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportApi } from "../../api/services";
import { ErrorPanel } from "../../components/ui/ErrorPanel";
import { Skeleton } from "../../components/ui/Skeleton";
import { formatCurrency, labelize } from "../../utils/format";

type MonthlyReport = {
  summary: any[];
  detailedClaims: any[];
  totalClaims?: number;
  totalAmount?: number;
};

export function ReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [patientId, setPatientId] = useState("");
  const [patientInput, setPatientInput] = useState("");

  const monthly = useQuery({
    queryKey: ["reports", "monthly", year, month],
    queryFn: () => reportApi.monthly(year, month),
  });

  const insurance = useQuery({
    queryKey: ["reports", "insurance"],
    queryFn: reportApi.insurancePerformance,
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

        <button
          className="btn btn-primary"
          type="button"
          onClick={() => window.print()}
        >
          Export PDF / Print
        </button>
      </section>

      {monthly.isError && <ErrorPanel error={monthly.error} />}
      {monthly.isLoading && <Skeleton rows={4} />}

      <div className="report-preview">
        <div className="report-watermark">Malavia Hospital Confidential</div>

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
              Malavia Hospital Confidential
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

            <div style={{ overflowX: "auto", marginBottom: 32 }}>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Claim No.</th>
                    <th>Patient Name</th>
                    <th>Patient ID</th>
                    <th>UHID</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Claim Amount</th>
                    <th>Deposit</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedClaims.map((claim: any) => (
                    <tr key={claim.claimId}>
                      <td>
                        {claim.claimNumber ||
                          claim.claimId?.toString().slice(-8)}
                      </td>
                      <td>{claim.patientName?.trim() || "Unknown Patient"}</td>
                      <td>{claim.patientId}</td>
                      <td>{claim.uhid || "-"}</td>
                      <td>{claim.type || "-"}</td>
                      <td>
                        <span
                          className={`status-badge ${claim.status?.toLowerCase() || ""}`}
                        >
                          {labelize(claim.status)}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, textAlign: "right" }}>
                        {formatCurrency(claim.totalClaimAmount)}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {formatCurrency(claim.depositAmount || 0)}
                      </td>
                      <td>
                        {new Date(claim.createdAt).toLocaleDateString("en-IN")}
                      </td>
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
