import React from "react";

interface DepartmentReportRow {
  claimId: string;
  claimNumber: string;
  patientId: string;
  patientName: string;
  approvedAmount: number;
  deductions: number;
  tds: number;
  pharmacy: number;
  lab: number;
  radiology: number;
  others: number;
  netPayable: number;
}

interface DepartmentGroup {
  departmentId: string;
  departmentName: string;
  rows: DepartmentReportRow[];
  totals: {
    approvedAmount: number;
    deductions: number;
    tds: number;
    pharmacy: number;
    lab: number;
    radiology: number;
    others: number;
    netPayable: number;
  };
}

interface DepartmentReportTableProps {
  groups: DepartmentGroup[];
  grandTotals: {
    approvedAmount: number;
    deductions: number;
    tds: number;
    pharmacy: number;
    lab: number;
    radiology: number;
    others: number;
    netPayable: number;
  };
  isLoading: boolean;
  formatCurrency: (val: number) => string;
}

export const DepartmentReportTable: React.FC<DepartmentReportTableProps> = ({
  groups,
  grandTotals,
  isLoading,
  formatCurrency,
}) => {
  if (isLoading) {
    return (
      <div style={{ padding: "24px 0", color: "#94a3b8", fontSize: 13 }}>
        Loading department-wise report data…
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div
        style={{
          padding: "32px 0",
          textAlign: "center",
          color: "#94a3b8",
          fontSize: 13,
          background: "var(--surface-1)",
          borderRadius: 8,
          border: "1px dashed var(--border)",
        }}
      >
        No department-wise claim records found for this period.
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 40 }}>
      <h3
        style={{
          fontSize: 13,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--accent-primary)",
          marginBottom: 16,
        }}
      >
        Department-wise Claims Financial Report
      </h3>

      {groups.map((group) => (
        <div key={group.departmentId} style={{ marginBottom: 36 }} className="department-section">
          <h4
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: 8,
              borderBottom: "1px solid var(--border)",
              paddingBottom: 4,
            }}
          >
            Department: {group.departmentName}
          </h4>

          <div className="report-table-wrapper" style={{ overflowX: "auto" }}>
            <table className="report-table" style={{ "--visible-cols": 11 } as React.CSSProperties}>
              <thead>
                <tr>
                  <th>Patient Name &amp; ID</th>
                  <th>Claim No.</th>
                  <th style={{ textAlign: "right" }}>Approved</th>
                  <th style={{ textAlign: "right" }}>Deductions</th>
                  <th style={{ textAlign: "right" }}>TDS</th>
                  <th style={{ textAlign: "right" }}>Pharmacy</th>
                  <th style={{ textAlign: "right" }}>Laboratory</th>
                  <th style={{ textAlign: "right" }}>Radiology</th>
                  <th style={{ textAlign: "right" }}>Others</th>
                  <th style={{ textAlign: "right" }}>Net (Before TDS)</th>
                  <th style={{ textAlign: "right" }}>Net (After TDS)</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row) => (
                  <tr key={row.claimId}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{row.patientName}</div>
                      <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{row.patientId}</div>
                    </td>
                    <td>
                      <strong>{row.claimNumber || "—"}</strong>
                    </td>
                    <td style={{ textAlign: "right" }}>{formatCurrency(row.approvedAmount)}</td>
                    <td style={{ textAlign: "right", color: row.deductions > 0 ? "#dc2626" : undefined }}>
                      {formatCurrency(row.deductions)}
                    </td>
                    <td style={{ textAlign: "right", color: row.tds > 0 ? "#dc2626" : undefined }}>
                      {formatCurrency(row.tds)}
                    </td>
                    <td style={{ textAlign: "right", color: "var(--text-secondary)" }}>
                      {formatCurrency(row.pharmacy)}
                    </td>
                    <td style={{ textAlign: "right", color: "var(--text-secondary)" }}>
                      {formatCurrency(row.lab)}
                    </td>
                    <td style={{ textAlign: "right", color: "var(--text-secondary)" }}>
                      {formatCurrency(row.radiology)}
                    </td>
                    <td style={{ textAlign: "right", color: "var(--text-secondary)" }}>
                      {formatCurrency(row.others)}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: "#059669" }}>
                      {formatCurrency(row.netPayable + row.tds)}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#059669" }}>
                      {formatCurrency(row.netPayable)}
                    </td>
                  </tr>
                ))}
                {/* Department Total Row */}
                <tr
                  style={{
                    fontWeight: 700,
                    background: "var(--surface-1)",
                    borderTop: "2px solid var(--border)",
                  }}
                >
                  <td colSpan={2} style={{ textAlign: "right" }}>
                    {group.departmentName} Total
                  </td>
                  <td style={{ textAlign: "right" }}>{formatCurrency(group.totals.approvedAmount)}</td>
                  <td style={{ textAlign: "right", color: "#dc2626" }}>{formatCurrency(group.totals.deductions)}</td>
                  <td style={{ textAlign: "right", color: "#dc2626" }}>{formatCurrency(group.totals.tds)}</td>
                  <td style={{ textAlign: "right" }}>{formatCurrency(group.totals.pharmacy)}</td>
                  <td style={{ textAlign: "right" }}>{formatCurrency(group.totals.lab)}</td>
                  <td style={{ textAlign: "right" }}>{formatCurrency(group.totals.radiology)}</td>
                  <td style={{ textAlign: "right" }}>{formatCurrency(group.totals.others)}</td>
                  <td style={{ textAlign: "right", color: "#059669" }}>{formatCurrency(group.totals.netPayable + group.totals.tds)}</td>
                  <td style={{ textAlign: "right", color: "#059669" }}>{formatCurrency(group.totals.netPayable)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Grand Total Section */}
      <div style={{ marginTop: 24, padding: "16px 20px", background: "var(--surface-2)", borderRadius: 8, border: "1px solid var(--border)" }}>
        <h4 style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", color: "var(--accent-primary)", marginBottom: 12 }}>
          Grand Summary
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
          <div className="report-summary-cell">
            <span>Grand Approved</span>
            <strong style={{ fontSize: 15 }}>{formatCurrency(grandTotals.approvedAmount)}</strong>
          </div>
          <div className="report-summary-cell">
            <span>Grand Deductions</span>
            <strong style={{ fontSize: 15, color: "#dc2626" }}>{formatCurrency(grandTotals.deductions)}</strong>
          </div>
          <div className="report-summary-cell">
            <span>Grand TDS</span>
            <strong style={{ fontSize: 15, color: "#dc2626" }}>{formatCurrency(grandTotals.tds)}</strong>
          </div>
          <div className="report-summary-cell">
            <span>Grand Pharmacy</span>
            <strong style={{ fontSize: 15 }}>{formatCurrency(grandTotals.pharmacy)}</strong>
          </div>
          <div className="report-summary-cell">
            <span>Grand Laboratory</span>
            <strong style={{ fontSize: 15 }}>{formatCurrency(grandTotals.lab)}</strong>
          </div>
          <div className="report-summary-cell">
            <span>Grand Radiology</span>
            <strong style={{ fontSize: 15 }}>{formatCurrency(grandTotals.radiology)}</strong>
          </div>
          <div className="report-summary-cell">
            <span>Grand Others</span>
            <strong style={{ fontSize: 15 }}>{formatCurrency(grandTotals.others)}</strong>
          </div>
          <div className="report-summary-cell">
            <span>Grand Net (Before TDS)</span>
            <strong style={{ fontSize: 15, color: "#059669" }}>{formatCurrency(grandTotals.netPayable + grandTotals.tds)}</strong>
          </div>
          <div className="report-summary-cell">
            <span>Grand Net (After TDS)</span>
            <strong style={{ fontSize: 15, color: "#059669" }}>{formatCurrency(grandTotals.netPayable)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
