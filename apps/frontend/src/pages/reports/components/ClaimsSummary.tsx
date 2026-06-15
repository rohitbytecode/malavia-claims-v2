import React from "react";
import type { ReportSummaryRow } from "../../../types/reports";

interface ClaimsSummaryProps {
  totalClaims: number;
  totalAmount: number;
  periodShortLabel: string;
  periodLabel: string;
  summary: ReportSummaryRow[];
  isLoading: boolean;
  formatCurrency: (val: number) => string;
  labelize: (val: string) => string;
  amountLabel?: string;
}

export const ClaimsSummary: React.FC<ClaimsSummaryProps> = ({
  totalClaims,
  totalAmount,
  periodShortLabel,
  periodLabel,
  summary,
  isLoading,
  formatCurrency,
  labelize,
  amountLabel = "Total Amount",
}) => {
  return (
    <>
      {/* KPI Strip */}
      <div className="report-summary" style={{ marginBottom: 28 }}>
        <div className="report-summary-cell">
          <span>Total Claims</span>
          <strong style={{ color: "var(--accent-primary)" }}>
            {totalClaims}
          </strong>
        </div>
        <div className="report-summary-cell">
          <span>{amountLabel}</span>
          <strong style={{ color: "var(--accent-primary)" }}>
            {formatCurrency(totalAmount)}
          </strong>
        </div>
        <div className="report-summary-cell">
          <span>Report Period</span>
          <strong style={{ fontSize: 14 }}>{periodShortLabel}</strong>
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
              color: "var(--accent-primary)",
              marginBottom: 12,
            }}
          >
            Claims by Status -{periodLabel}
          </h3>
          <div className="report-summary" style={{ marginBottom: 28 }}>
            {summary.map((row) => (
              <div className="report-summary-cell" key={row._id ?? row.status}>
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

      {summary.length === 0 && !isLoading && (
        <div
          style={{
            padding: "24px 0",
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 13,
          }}
        >
          No claims found for {periodLabel}
        </div>
      )}
    </>
  );
};
