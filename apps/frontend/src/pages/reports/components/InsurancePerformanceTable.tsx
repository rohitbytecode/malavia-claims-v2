import React from "react";
import type { InsurancePerformanceRow } from "../../../types/reports";

interface InsurancePerformanceTableProps {
  insuranceData: InsurancePerformanceRow[];
  isLoading: boolean;
  formatCurrency: (val: number) => string;
}

export const InsurancePerformanceTable: React.FC<InsurancePerformanceTableProps> = ({
  insuranceData,
  isLoading,
  formatCurrency,
}) => {
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
        Insurance Company Performance
      </h3>
      <div className="report-table-wrapper" style={{ overflowX: "auto" }}>
        <table className="report-table" style={{ "--visible-cols": 5 } as React.CSSProperties}>
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
            {isLoading && (
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
            {!isLoading && insuranceData.length === 0 && (
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
            {insuranceData.map((row) => (
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
      </div>
    </div>
  );
};
