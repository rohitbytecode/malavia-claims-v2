import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { dashboardApi, alertApi } from "../../api/services";
import { AlertPlaybookPanel } from "../../components/alerts/AlertPlaybookPanel";
import { OperationalQueue } from "../../components/dashboard/OperationalQueue";
import { RoleMissionPanel } from "../../components/dashboard/RoleMissionPanel";
import { Card, CardHeader } from "../../components/ui/Card";
import { ErrorPanel } from "../../components/ui/ErrorPanel";
import { Skeleton } from "../../components/ui/Skeleton";
import { StatusBadge } from "../../components/ui/StatusBadge";
import {
  insurerWaitingStatuses,
  roleExperiences,
} from "../../constants/operations";
import { useAuthStore } from "../../store/auth.store";
import { formatCurrency, labelize } from "../../utils/format";

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const metrics = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.metrics,
  });
  const alerts = useQuery({
    queryKey: ["alerts", "active", 12],
    queryFn: () => alertApi.active({ limit: 12 }),
  });

  const roleHotStatuses = useMemo(() => {
    const role = user?.role;
    return role ? roleExperiences[role].primaryQueues : [];
  }, [user?.role]);

  if (metrics.isLoading) return <Skeleton rows={8} />;
  if (metrics.isError) return <ErrorPanel error={metrics.error} />;
  if (!metrics.data)
    return <ErrorPanel error={new Error("Dashboard metrics unavailable")} />;

  const data = metrics.data;
  const insurerWaiting = data.claimsByStatus
    .filter((row) => insurerWaitingStatuses.includes(row.status))
    .reduce((sum, row) => sum + row.count, 0);
  const urgentAgeing =
    data.ageingSummary.between60And90Days + data.ageingSummary.over90Days;
  const financialBlockers =
    data.pendingCounts.settlements + data.pendingDepositRefunds;

  return (
    <div className="command-center page-stack">
      <section className="hero-command premium-panel">
        <div className="hero-copy">
          <p className="eyebrow">Operational Command Center</p>
          <h1>Malavia Claims Control</h1>
          <span>
            Backend-derived live control surface for insurer waiting, settlement
            blockers, courier ageing, refunds, alerts, and workflow bottlenecks.
          </span>
        </div>
        <div className="hero-radar" aria-label="Operational pulse">
          <div className="radar-core">MH</div>
          <div className="radar-ring one" />
          <div className="radar-ring two" />
        </div>
        <div className="hero-kpis">
          <div>
            <span>Insurer waiting</span>
            <strong>{insurerWaiting}</strong>
          </div>
          <div>
            <span>Finance blockers</span>
            <strong>{financialBlockers}</strong>
          </div>
          <div>
            <span>Ageing risk</span>
            <strong>{urgentAgeing}</strong>
          </div>
          <div>
            <span>Settled value</span>
            <strong>
              {formatCurrency(data.financials.totalSettledAmount)}
            </strong>
          </div>
        </div>
      </section>

      <RoleMissionPanel role={user?.role} />

      <div className="dashboard-grid">
        <OperationalQueue metrics={data} role={user?.role} />
        <AlertPlaybookPanel
          alerts={alerts.data?.data ?? []}
          role={user?.role}
        />
      </div>

      <div className="dashboard-grid wide-left">
        <Card className="premium-panel workflow-density-card">
          <CardHeader
            title="Workflow density map"
            eyebrow="Status distribution from claims module"
          />
          <div className="status-orbit-grid">
            {data.claimsByStatus.map((row) => (
              <Link
                className={
                  roleHotStatuses.includes(row.status)
                    ? "status-orbit hot"
                    : "status-orbit"
                }
                to={`/claims?status=${row.status}`}
                key={row.status}
              >
                <StatusBadge value={row.status} compact />
                <strong>{row.count}</strong>
                <span>{labelize(row.status)}</span>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="premium-panel ageing-card">
          <CardHeader
            title="Ageing intelligence"
            eyebrow="Cron alert pressure bands"
          />
          <div className="age-lanes">
            <div>
              <span>Under 30 days</span>
              <strong>{data.ageingSummary.under30Days}</strong>
            </div>
            <div>
              <span>30-60 days</span>
              <strong>{data.ageingSummary.between30And60Days}</strong>
            </div>
            <div className="warning">
              <span>60-90 days</span>
              <strong>{data.ageingSummary.between60And90Days}</strong>
            </div>
            <div className="critical">
              <span>Over 90 days</span>
              <strong>{data.ageingSummary.over90Days}</strong>
            </div>
          </div>
          <div className="cron-note">
            Daily backend checks generate courier, settlement, and refund
            alerts; this panel shows where those automated escalations will
            intensify.
          </div>
        </Card>
      </div>
    </div>
  );
}
