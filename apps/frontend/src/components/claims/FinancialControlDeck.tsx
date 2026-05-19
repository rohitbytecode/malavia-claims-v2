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
  const backendPreview =
    settlement?.netPayable ??
    Math.max(
      0,
      claim.totalClaimAmount -
        (claim.deductions ?? 0) -
        (claim.tdsAmount ?? 0) -
        (claim.hospitalDiscount ?? 0)
    );
  const refundRisk = deposit
    ? deposit.refundAmount > deposit.collectedAmount
    : false;

  return (
    <section className="financial-deck premium-panel">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow">Financial command deck</p>
          <h2>Settlement · TDS · Deductions · Refunds</h2>
        </div>
        <strong className="net-payable">
          {formatCurrency(backendPreview)}
        </strong>
      </div>
      <div className="finance-grid">
        <div>
          <span>Claimed amount</span>
          <strong>{formatCurrency(claim.totalClaimAmount)}</strong>
        </div>
        <div>
          <span>TDS</span>
          <strong>{formatCurrency(settlement?.tds ?? claim.tdsAmount)}</strong>
        </div>
        <div>
          <span>Deductions</span>
          <strong>
            {formatCurrency(settlement?.deductions ?? claim.deductions)}
          </strong>
        </div>
        <div>
          <span>Hospital discount</span>
          <strong>
            {formatCurrency(
              settlement?.hospitalDiscount ?? claim.hospitalDiscount
            )}
          </strong>
        </div>
        <div>
          <span>Settlement method</span>
          <strong>{labelize(settlement?.settlementMethod)}</strong>
        </div>
        <div>
          <span>Settlement date</span>
          <strong>{formatDateTime(settlement?.settlementDate)}</strong>
        </div>
        <div className={refundRisk ? "finance-risk" : ""}>
          <span>Collected deposit</span>
          <strong>
            {formatCurrency(deposit?.collectedAmount ?? claim.depositAmount)}
          </strong>
        </div>
        <div className={refundRisk ? "finance-risk" : ""}>
          <span>Refund amount</span>
          <strong>
            {formatCurrency(deposit?.refundAmount ?? claim.refundAmount)}
          </strong>
        </div>
      </div>
      <p className="validation-note">
        Frontend mirrors backend restrictions: settlement net payable is
        server-calculated, allocations must remain within settlement value, and
        refunds cannot exceed deposits.
      </p>
    </section>
  );
}
