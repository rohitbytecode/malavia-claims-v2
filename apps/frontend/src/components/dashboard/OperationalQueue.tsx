import { Link } from "react-router-dom";
import type { ClaimStatus, DashboardMetrics, Role } from "../../types/domain";
import { roleExperiences } from "../../constants/operations";
import { formatCurrency, labelize } from "../../utils/format";
import { StatusBadge } from "../ui/StatusBadge";

export function OperationalQueue({
  metrics,
  role,
}: {
  metrics: DashboardMetrics;
  role?: Role;
}) {
  const experience = role ? roleExperiences[role] : undefined;
  const rows: {
    label: string;
    status?: ClaimStatus;
    count: number;
    priority: "high" | "critical" | "medium";
  }[] = [
    {
      label: "Preauth awaiting insurer",
      status: "PREAUTH_PENDING",
      count: metrics.pendingCounts.preauth,
      priority: "high",
    },
    {
      label: "Final approval bottleneck",
      status: "FINAL_APPROVAL_PENDING",
      count: metrics.pendingCounts.finalApproval,
      priority: "high",
    },
    {
      label: "Settlement desk pending",
      status: "SETTLEMENT_PENDING",
      count: metrics.pendingCounts.settlements,
      priority: "critical",
    },
    {
      label: "Courier delay >45 days",
      status: undefined,
      count: metrics.delayedClaims.over45Days,
      priority: "high",
    },
    {
      label: "Courier delay >60 days",
      status: undefined,
      count: metrics.delayedClaims.over60Days,
      priority: "critical",
    },
    {
      label: "Deposit refunds pending",
      status: undefined,
      count: metrics.pendingDepositRefunds,
      priority: "medium",
    },
  ];

  return (
    <section className="ops-queue premium-panel">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow">Operational queue</p>
          <h2>Backend-driven action lanes</h2>
        </div>
        <div className="finance-orb">
          <span>Settled value</span>
          <strong>
            {formatCurrency(metrics.financials.totalSettledAmount)}
          </strong>
        </div>
      </div>
      <div className="queue-grid">
        {rows.map((row) => {
          const highlighted = Boolean(
            row.status && experience?.primaryQueues.includes(row.status)
          );
          const content = (
            <article
              className={`queue-card ${row.priority} ${highlighted ? "role-hot" : ""}`}
            >
              <div>
                <span>{row.label}</span>
                {row.status ? (
                  <StatusBadge value={row.status} compact />
                ) : (
                  <em>{labelize(row.priority)}</em>
                )}
              </div>
              <strong>{row.count}</strong>
            </article>
          );
          return row.status ? (
            <Link key={row.label} to={`/claims?status=${row.status}`}>
              {content}
            </Link>
          ) : (
            <div key={row.label}>{content}</div>
          );
        })}
      </div>
    </section>
  );
}
