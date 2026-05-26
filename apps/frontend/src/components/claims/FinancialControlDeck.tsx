import { useState } from "react";
import type { Claim, Deposit, Settlement } from "../../types/domain";
import { formatCurrency, formatDateTime, labelize } from "../../utils/format";

export function FinancialControlDeck({
  claim,
  settlement,
  deposit,
}: {
  claim: Claim;
  settlement?: Settlement | null;
  deposit?: Deposit | null;
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const netPayable =
    settlement?.netPayable ??
    Math.max(
      0,
      claim.totalClaimAmount -
        (claim.deductions ?? 0) -
        (claim.tdsAmount ?? 0) -
        (claim.hospitalDiscount ?? 0)
    );

  const hasRefundRisk = deposit
    ? (deposit.refundAmount ?? 0) > (deposit.collectedAmount ?? 0)
    : false;

  const hasSettlementBreakdown = Boolean(
    settlement?.departmentBreakdown && settlement.departmentBreakdown.length > 0
  );
  const hasClaimBreakdown = Boolean(
    claim.billBreakdown && claim.billBreakdown.length > 0
  );

  return (
    <section className="financial-deck">
      <div className="deck-header">
        <div>
          <p className="eyebrow">FINANCIAL COMMAND DECK</p>
          <h2>Settlement · TDS · Deductions · Refunds</h2>
        </div>
        <div className="net-payable" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
          <span className="net-label">Net Payable (Before TDS)</span>
          <strong style={{ fontSize: 18 }}>
            {formatCurrency(netPayable + (settlement?.tds ?? claim.tdsAmount ?? 0))}
          </strong>
          <span className="net-label" style={{ fontSize: 10, marginTop: 4 }}>Net Payable (After TDS)</span>
          <strong style={{ fontSize: 14, opacity: 0.9 }}>
            {formatCurrency(netPayable)}
          </strong>
        </div>
      </div>

      <div className="finance-grid">
        <div className="finance-item">
          <span>Claimed amount</span>
          <strong>{formatCurrency(claim.totalClaimAmount)}</strong>
        </div>
        <div className="finance-item">
          <span>TDS</span>
          <strong>
            {formatCurrency(settlement?.tds ?? claim.tdsAmount ?? 0)}
          </strong>
        </div>
        <div className="finance-item">
          <span>Deductions</span>
          <strong>
            {formatCurrency(settlement?.deductions ?? claim.deductions ?? 0)}
          </strong>
        </div>
        <div className="finance-item">
          <span>Hospital discount</span>
          <strong>
            {formatCurrency(
              settlement?.hospitalDiscount ?? claim.hospitalDiscount ?? 0
            )}
          </strong>
        </div>

        <div className="finance-item">
          <span>Settlement method</span>
          <strong>{labelize(settlement?.settlementMethod) || "—"}</strong>
        </div>
        <div className="finance-item">
          <span>Settlement date</span>
          <strong>
            {settlement?.settlementDate
              ? formatDateTime(settlement.settlementDate)
              : "—"}
          </strong>
        </div>

        <div className={`finance-item ${hasRefundRisk ? "risk" : ""}`}>
          <span>Collected deposit</span>
          <strong>
            {formatCurrency(
              deposit?.collectedAmount ?? claim.depositAmount ?? 0
            )}
          </strong>
        </div>
        <div className={`finance-item ${hasRefundRisk ? "risk" : ""}`}>
          <span>Refund amount</span>
          <strong>
            {formatCurrency(deposit?.refundAmount ?? claim.refundAmount ?? 0)}
          </strong>
        </div>
      </div>

      {(hasSettlementBreakdown || hasClaimBreakdown) && (
        <div
          style={{
            marginTop: 16,
            borderTop:
              "1px solid color-mix(in srgb, var(--text-tertiary) 15%, transparent)",
            paddingTop: 16,
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowBreakdown(!showBreakdown)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              justifyContent: "space-between",
              padding: "10px 14px",
              background:
                "var(--background-secondary, rgba(255, 255, 255, 0.05))",
              border:
                "1px solid color-mix(in srgb, var(--text-tertiary) 15%, transparent)",
              borderRadius: "var(--r-md)",
              cursor: "pointer",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 13 }}>
              {hasSettlementBreakdown
                ? "Department-wise Settlement Breakdown"
                : "Department-wise Claim Bill Breakdown"}
            </span>
            <span style={{ fontSize: 11, opacity: 0.8 }}>
              {showBreakdown ? "▲ Hide" : "▼ Show Details"}
            </span>
          </button>

          {showBreakdown && (
            <div style={{ marginTop: 12, overflowX: "auto" }}>
              {hasSettlementBreakdown && settlement?.departmentBreakdown ? (
                <table
                  style={{
                    width: "100%",
                    fontSize: 12,
                    borderCollapse: "collapse",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom:
                          "1px solid color-mix(in srgb, var(--text-tertiary) 20%, transparent)",
                      }}
                    >
                      <th style={{ textAlign: "left", padding: "8px 6px" }}>
                        Department
                      </th>
                      <th style={{ textAlign: "right", padding: "8px 6px" }}>
                        Claimed
                      </th>
                      <th style={{ textAlign: "right", padding: "8px 6px" }}>
                        Approved
                      </th>
                      <th style={{ textAlign: "right", padding: "8px 6px" }}>
                        Deductions
                      </th>
                      <th style={{ textAlign: "right", padding: "8px 6px" }}>
                        Discount
                      </th>
                      <th style={{ textAlign: "right", padding: "8px 6px" }}>
                        Net Payout
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlement.departmentBreakdown.map((item) => (
                      <tr
                        key={item.departmentCategory}
                        style={{
                          borderBottom:
                            "1px solid color-mix(in srgb, var(--text-tertiary) 10%, transparent)",
                        }}
                      >
                        <td style={{ padding: "8px 6px", fontWeight: 600 }}>
                          {labelize(item.departmentCategory)}
                        </td>
                        <td style={{ textAlign: "right", padding: "8px 6px" }}>
                          {formatCurrency(item.claimedAmount)}
                        </td>
                        <td style={{ textAlign: "right", padding: "8px 6px" }}>
                          {formatCurrency(item.approvedAmount)}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            padding: "8px 6px",
                            color:
                              item.deduction > 0 ? "var(--red)" : undefined,
                          }}
                        >
                          {item.deduction > 0
                            ? `-${formatCurrency(item.deduction)}`
                            : "—"}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            padding: "8px 6px",
                            color:
                              item.discountAmount > 0
                                ? "var(--amber)"
                                : undefined,
                          }}
                        >
                          {item.discountAmount > 0
                            ? `-${formatCurrency(item.discountAmount)} (${item.discountPercent}%)`
                            : "—"}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            padding: "8px 6px",
                            fontWeight: 700,
                          }}
                        >
                          {formatCurrency(item.netAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(180px, 1fr))",
                    gap: 10,
                  }}
                >
                  {claim.billBreakdown?.map((item) => (
                    <div
                      key={item.departmentCategory}
                      style={{
                        padding: "10px 14px",
                        background:
                          "color-mix(in srgb, var(--accent-primary) 6%, transparent)",
                        borderRadius: "var(--r-md)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-secondary)",
                          marginBottom: 2,
                        }}
                      >
                        {labelize(item.departmentCategory)}
                      </div>
                      <strong style={{ fontSize: 15 }}>
                        {formatCurrency(item.amount)}
                      </strong>
                      {item.description && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text-tertiary)",
                            marginTop: 2,
                          }}
                        >
                          {item.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <p className="validation-note">
        All calculations follow system rules. Refunds cannot exceed collected
        deposits.
      </p>
    </section>
  );
}
