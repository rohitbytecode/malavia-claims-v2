import { alertPlaybook, severityRank } from "../../constants/operations";
import type { Alert, Role } from "../../types/domain";
import { formatDateTime } from "../../utils/format";
import { StatusBadge } from "../ui/StatusBadge";

export function AlertPlaybookPanel({
  alerts,
  role,
}: {
  alerts: Alert[];
  role?: Role;
}) {
  const sorted = [...alerts].sort(
    (a, b) => severityRank[b.severity] - severityRank[a.severity]
  );

  return (
    <section className="playbook-panel premium-panel">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow">Alert playbook</p>
          <h2>Risk response guidance</h2>
        </div>
        <strong>
          {sorted.filter((alert) => !alert.resolved).length} active
        </strong>
      </div>
      <div className="playbook-list">
        {sorted.slice(0, 6).map((alert) => {
          const play = alertPlaybook[alert.type];
          const owner = role ? play.ownerRoles.includes(role) : false;
          return (
            <article
              className={`playbook-item ${owner ? "owned" : ""}`}
              key={alert._id}
            >
              <div className="playbook-head">
                <StatusBadge value={alert.severity} compact />
                <span>{formatDateTime(alert.createdAt)}</span>
              </div>
              <strong>{play.label}</strong>
              <p>{alert.message}</p>
              <em>{play.response}</em>
            </article>
          );
        })}
      </div>
    </section>
  );
}
