import React, { useMemo } from "react";
import type { DetailedClaim } from "../../../types/reports";

interface DetailedClaimsTableProps {
  detailedClaims: DetailedClaim[];
  visibleColumns: Record<string, boolean>;
  pharmacyAmountMap?: Map<string, number>;
  setVisibleColumns: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  patientMap: Map<string, string>;
  doctorMap: Map<string, string>;
  departmentMap: Map<string, string>;
  formatCurrency: (val: number) => string;
  labelize: (val: string) => string;
}

export const DetailedClaimsTable: React.FC<DetailedClaimsTableProps> = ({
  detailedClaims,
  visibleColumns,
  setVisibleColumns,
  patientMap,
  doctorMap,
  departmentMap,
  formatCurrency,
  labelize,
  pharmacyAmountMap,
}) => {
  const visibleColumnCount = useMemo(() => {
    return Object.values(visibleColumns).filter(Boolean).length;
  }, [visibleColumns]);

  const totals = useMemo(() => {
    return {
      claimAmount: detailedClaims.reduce(
        (sum, c) =>
          sum +
          (pharmacyAmountMap?.get(c.claimId) ??
            (c.status === "SETTLED" &&
            c.settledAmount !== null &&
            c.settledAmount !== undefined
              ? c.settledAmount
              : (c.totalClaimAmount ?? 0))),
        0
      ),
      deposit: detailedClaims.reduce(
        (sum, c) => sum + (c.depositAmount ?? 0),
        0
      ),
    };
  }, [detailedClaims]);

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
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
        Detailed claims
      </h3>

      {/* Column selectors */}
      <div
        className="hide-on-print"
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 16,
          background: "var(--surface-1)",
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid var(--border)",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--text-tertiary)",
            alignSelf: "center",
          }}
        >
          Visible Columns:
        </span>
        {Object.keys(visibleColumns).map((key) => (
          <label
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              color: "var(--text-secondary)",
            }}
          >
            <input
              type="checkbox"
              checked={visibleColumns[key]}
              onChange={() => toggleColumn(key)}
            />
            {key === "claimNo"
              ? "Claim No."
              : key === "patientId"
                ? "Patient ID"
                : key === "patientName"
                  ? "Patient Name"
                  : key === "doctorName"
                    ? "Doctor"
                    : key === "department"
                      ? "Department"
                      : key === "type"
                        ? "Type"
                        : key === "status"
                          ? "Status"
                          : key === "claimAmount"
                            ? "Claim Amount"
                            : "Deposit"}
          </label>
        ))}
      </div>

      {detailedClaims.length === 0 ? (
        <div
          style={{
            padding: "24px 0",
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 13,
          }}
        >
          No detailed claims to list.
        </div>
      ) : (
        <div className="report-table-wrapper" style={{ overflowX: "auto" }}>
          <table
            className="report-table"
            style={
              { "--visible-cols": visibleColumnCount } as React.CSSProperties
            }
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
                {visibleColumns.claimAmount && (
                  <th>
                    {pharmacyAmountMap ? "Pharmacy Amount" : "Claim Amount"}
                  </th>
                )}
                {visibleColumns.deposit && <th>deposit</th>}
              </tr>
            </thead>
            <tbody>
              {detailedClaims.map((claim) => (
                <tr key={claim.claimId}>
                  {visibleColumns.claimNo && (
                    <td>
                      {claim.claimNumber || claim.claimId?.toString().slice(-8)}
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
                        : typeof claim.doctor === "object" && claim.doctor?.name
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
                      {formatCurrency(
                        pharmacyAmountMap?.get(claim.claimId) ??
                          (claim.status === "SETTLED" &&
                          claim.settledAmount !== null &&
                          claim.settledAmount !== undefined
                            ? claim.settledAmount
                            : claim.totalClaimAmount)
                      )}
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
            <tfoot>
              <tr style={{ fontWeight: 700, background: "var(--surface-1)" }}>
                {/* Find first active column to place "TOTALS" */}
                {(() => {
                  let totalsColSpan = 0;
                  const columnsKeys = [
                    "claimNo",
                    "patientId",
                    "patientName",
                    "doctorName",
                    "department",
                    "type",
                    "status",
                  ];
                  for (const key of columnsKeys) {
                    if (visibleColumns[key]) {
                      totalsColSpan++;
                    }
                  }
                  if (totalsColSpan === 0) return null;
                  return (
                    <td colSpan={totalsColSpan} style={{ textAlign: "right" }}>
                      TOTALS
                    </td>
                  );
                })()}
                {visibleColumns.claimAmount && (
                  <td style={{ textAlign: "right", fontWeight: 700 }}>
                    {formatCurrency(totals.claimAmount)}
                  </td>
                )}
                {visibleColumns.deposit && (
                  <td style={{ textAlign: "right", fontWeight: 700 }}>
                    {formatCurrency(totals.deposit)}
                  </td>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
