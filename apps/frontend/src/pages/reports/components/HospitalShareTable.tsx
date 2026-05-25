import React from "react";

interface HospitalShareRow {
  _id: string;
  claimNumber?: string;
  insuranceCompany?: string;
  settlementDate: string;
  approvedAmount: number;
  netPayable: number;
  pharmacyShare: number;
  labShare: number;
  radiologyShare: number;
  vendorPayout: number;
  hospitalShare: number;
}

interface HospitalShareTotals {
  totalApproved: number;
  totalNetPayable: number;
  totalPharmacyShare: number;
  totalLabShare: number;
  totalRadiologyShare: number;
  totalVendorPayout: number;
  totalHospitalShare: number;
}

interface HospitalShareTableProps {
  data?: {
    rows: HospitalShareRow[];
    totals: HospitalShareTotals;
    count: number;
  };
  isLoading: boolean;
  formatCurrency: (val: number) => string;
}

export const HospitalShareTable: React.FC<HospitalShareTableProps> = ({
  data,
  isLoading,
  formatCurrency,
}) => {
  const rows = data?.rows ?? [];
  const totals = data?.totals ?? {
    totalApproved: 0,
    totalNetPayable: 0,
    totalPharmacyShare: 0,
    totalLabShare: 0,
    totalRadiologyShare: 0,
    totalVendorPayout: 0,
    totalHospitalShare: 0,
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
        Hospital Share &amp; Vendor Payout Report
      </h3>
      <div className="report-table-wrapper" style={{ overflowX: "auto" }}>
        <table
          className="report-table"
          style={{ "--visible-cols": 10 } as React.CSSProperties}
        >
          <thead>
            <tr>
              <th>Date</th>
              <th>Claim Number</th>
              <th>Insurance Company</th>
              <th style={{ textAlign: "right" }}>Approved</th>
              <th style={{ textAlign: "right" }}>Net Payable</th>
              <th style={{ textAlign: "right" }}>Pharmacy</th>
              <th style={{ textAlign: "right" }}>Laboratory</th>
              <th style={{ textAlign: "right" }}>Radiology</th>
              <th style={{ textAlign: "right" }}>Total Vendor</th>
              <th style={{ textAlign: "right" }}>Hospital Share</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td
                  colSpan={10}
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
            {!isLoading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  style={{
                    textAlign: "center",
                    padding: "16px",
                    color: "#94a3b8",
                  }}
                >
                  No settled claims with breakdowns in this period
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row._id}>
                <td>{new Date(row.settlementDate).toLocaleDateString()}</td>
                <td>
                  <strong>{row.claimNumber || "—"}</strong>
                </td>
                <td>{row.insuranceCompany || "—"}</td>
                <td style={{ textAlign: "right" }}>
                  {formatCurrency(row.approvedAmount)}
                </td>
                <td style={{ textAlign: "right" }}>
                  {formatCurrency(row.netPayable)}
                </td>
                <td style={{ textAlign: "right", color: "var(--text-secondary)" }}>
                  {formatCurrency(row.pharmacyShare)}
                </td>
                <td style={{ textAlign: "right", color: "var(--text-secondary)" }}>
                  {formatCurrency(row.labShare)}
                </td>
                <td style={{ textAlign: "right", color: "var(--text-secondary)" }}>
                  {formatCurrency(row.radiologyShare)}
                </td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>
                  {formatCurrency(row.vendorPayout)}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    fontWeight: 700,
                    color: "var(--green)",
                  }}
                >
                  {formatCurrency(row.hospitalShare)}
                </td>
              </tr>
            ))}
            {rows.length > 0 && (
              <tr
                style={{
                  fontWeight: 800,
                  borderTop: "2px solid color-mix(in srgb, var(--text-tertiary) 30%, transparent)",
                  background: "var(--background-secondary, rgba(255, 255, 255, 0.02))",
                }}
              >
                <td colSpan={3}>TOTAL</td>
                <td style={{ textAlign: "right" }}>
                  {formatCurrency(totals.totalApproved)}
                </td>
                <td style={{ textAlign: "right" }}>
                  {formatCurrency(totals.totalNetPayable)}
                </td>
                <td style={{ textAlign: "right" }}>
                  {formatCurrency(totals.totalPharmacyShare)}
                </td>
                <td style={{ textAlign: "right" }}>
                  {formatCurrency(totals.totalLabShare)}
                </td>
                <td style={{ textAlign: "right" }}>
                  {formatCurrency(totals.totalRadiologyShare)}
                </td>
                <td style={{ textAlign: "right" }}>
                  {formatCurrency(totals.totalVendorPayout)}
                </td>
                <td style={{ textAlign: "right", color: "var(--green)" }}>
                  {formatCurrency(totals.totalHospitalShare)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
