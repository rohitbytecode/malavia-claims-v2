import React from "react";
import type { SettlementReportData } from "../../../types/reports";

interface SettlementReviewTableProps {
  settlementData: SettlementReportData | undefined;
  isLoading: boolean;
  formatCurrency: (val: number) => string;
  labelize: (val: string) => string;
}

export const SettlementReviewTable: React.FC<SettlementReviewTableProps> = ({
  settlementData,
  isLoading,
  formatCurrency,
  labelize,
}) => {
  const settlements = settlementData?.settlements ?? [];
  const totals = settlementData?.totals ?? {
    totalClaimAmount: 0,
    totalApproved: 0,
    totalDeductions: 0,
    totalTds: 0,
    totalHospitalDiscount: 0,
    totalNetPayable: 0,
  };

  return (
    <div style={{ marginBottom: 40 }}>
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
        Settlement Financial Review
      </h3>

      {isLoading && (
        <div style={{ padding: "24px 0", color: "#94a3b8", fontSize: 13 }}>
          Loading settlement data…
        </div>
      )}

      {!isLoading && settlements.length === 0 && (
        <div
          style={{
            padding: "24px 0",
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 13,
          }}
        >
          No settlement details found for this period
        </div>
      )}

      {!isLoading && settlements.length > 0 && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div className="report-summary-cell">
              <span>Settlements</span>
              <strong style={{ color: "var(--accent-primary)" }}>
                {settlementData?.count ?? 0}
              </strong>
            </div>
            <div className="report-summary-cell">
              <span>Approved</span>
              <strong style={{ color: "var(--accent-primary)", fontSize: 16 }}>
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
              <span>Net Payable (Before TDS)</span>
              <strong style={{ color: "#059669", fontSize: 16 }}>
                {formatCurrency(totals.totalNetPayable + totals.totalTds)}
              </strong>
            </div>
            <div className="report-summary-cell">
              <span>Net Payable (After TDS)</span>
              <strong style={{ color: "#059669", fontSize: 16 }}>
                {formatCurrency(totals.totalNetPayable)}
              </strong>
            </div>
          </div>

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
                  <th>Net (Before TDS)</th>
                  <th>Net (After TDS)</th>
                  <th>Method</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((s) => (
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
                        color: s.hospitalDiscount > 0 ? "#f59e0b" : undefined,
                      }}
                    >
                      {formatCurrency(s.hospitalDiscount)}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontWeight: 600,
                        color: "#059669",
                      }}
                    >
                      {formatCurrency(s.netPayable + s.tds)}
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
                        ? new Date(s.settlementDate).toLocaleDateString("en-IN")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr
                  style={{
                    fontWeight: 700,
                    background: "var(--surface-1)",
                    borderTop: "2px solid var(--border)",
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
                  <td style={{ textAlign: "right", color: "#dc2626" }}>
                    {formatCurrency(totals.totalDeductions)}
                  </td>
                  <td style={{ textAlign: "right", color: "#dc2626" }}>
                    {formatCurrency(totals.totalTds)}
                  </td>
                  <td style={{ textAlign: "right", color: "#f59e0b" }}>
                    {formatCurrency(totals.totalHospitalDiscount)}
                  </td>
                  <td style={{ textAlign: "right", color: "#059669" }}>
                    {formatCurrency(totals.totalNetPayable + totals.totalTds)}
                  </td>
                  <td style={{ textAlign: "right", color: "#059669" }}>
                    {formatCurrency(totals.totalNetPayable)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
