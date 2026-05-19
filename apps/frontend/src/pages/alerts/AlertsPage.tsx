import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { alertApi } from "../../api/services";
import { DataTable, type Column } from "../../components/tables/DataTable";
import { Button } from "../../components/ui/Button";
import { ErrorPanel } from "../../components/ui/ErrorPanel";
import { Skeleton } from "../../components/ui/Skeleton";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAuthStore } from "../../store/auth.store";
import type { Alert } from "../../types/domain";
import { formatDateTime, labelize } from "../../utils/format";
export function AlertsPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["alerts", "active"],
    queryFn: () => alertApi.active({ limit: 100 }),
  });
  const resolve = useMutation({
    mutationFn: (alertId: string) =>
      alertApi.resolve(alertId, {
        resolvedBy: user?._id,
        remarks: "Resolved from active alerts queue",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts", "active"] }),
  });
  const columns: Column<Alert>[] = [
    {
      key: "severity",
      header: "Severity",
      cell: (a) => <StatusBadge value={a.severity} />,
      sortValue: (a) => a.severity,
    },
    {
      key: "type",
      header: "Type",
      cell: (a) => labelize(a.type),
      sortValue: (a) => a.type,
    },
    {
      key: "message",
      header: "Message",
      cell: (a) => a.message,
      sortValue: (a) => a.message,
    },
    {
      key: "claim",
      header: "Claim",
      cell: (a) => <Link to={`/claims/${a.claimId}`}>{a.claimId}</Link>,
      sortValue: (a) => a.claimId,
    },
    {
      key: "created",
      header: "Created",
      cell: (a) => formatDateTime(a.createdAt),
      sortValue: (a) => a.createdAt,
    },
    {
      key: "action",
      header: "Action",
      cell: (a) => (
        <Button variant="secondary" onClick={() => resolve.mutate(a._id)}>
          Resolve
        </Button>
      ),
    },
  ];
  if (query.isLoading) return <Skeleton rows={8} />;
  if (query.isError) return <ErrorPanel error={query.error} />;
  const rows = query.data?.data ?? [];
  return (
    <div className="page-stack">
      <div className="page-title">
        <p className="eyebrow">Operational risk queue</p>
        <h1>Active Alerts</h1>
        <span>
          Courier delays, settlement blockers, deposits mismatches and approval
          bottlenecks.
        </span>
      </div>
      <DataTable rows={rows} columns={columns} getRowId={(row) => row._id} />
    </div>
  );
}
