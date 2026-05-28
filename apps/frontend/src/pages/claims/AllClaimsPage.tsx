import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth.store";

import { claimsApi, patientApi } from "../../api/services";

import { DataTable, type Column } from "../../components/tables/DataTable";

import { ErrorPanel } from "../../components/ui/ErrorPanel";
import { Skeleton } from "../../components/ui/Skeleton";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";

import type { Claim } from "../../types/domain";

import {
  ageInDays,
  formatCurrency,
  formatDate,
  nameOf,
} from "../../utils/format";

export function AllClaimsPage() {
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);

  const query = useQuery({
    queryKey: ["all-claims"],
    queryFn: () => claimsApi.list({ limit: 1000 }),
  });

  const patientsQuery = useQuery({
    queryKey: ["patients"],
    queryFn: () => patientApi.list({ limit: 100 }),
  });

  const patientMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of patientsQuery.data?.data ?? []) {
      if (p._id) map.set(p._id, p.name);
      if (p.id) map.set(p.id, p.name);
      if (p.patientId) map.set(p.patientId, p.name);
    }
    return map;
  }, [patientsQuery.data]);

  const rows = query.data?.data ?? [];

  const columns: Column<Claim>[] = [
    {
      key: "id",
      header: "Claim",
      pinned: true,
      cell: (c) => <strong>{c.claimNumber ?? c.id.slice(-8)}</strong>,
      sortValue: (c) => c.claimNumber ?? c.id ?? "",
      searchValue: (c) => `${c.claimNumber ?? ""} ${c.id}`,
    },
    {
      key: "patient",
      header: "Patient / Hospital",
      cell: (c) => (
        <div>
          <strong>{patientMap.get(c.patientId) ?? "Unknown"}</strong>
          <span>{c.hospitalId ?? "-"}</span>
        </div>
      ),
      sortValue: (c) => patientMap.get(c.patientId) ?? "Unknown",
      searchValue: (c) =>
        `${patientMap.get(c.patientId) ?? "Unknown"} ${c.hospitalId ?? ""}`,
    },
    {
      key: "type",
      header: "Type",
      cell: (c) => <StatusBadge value={c.type} compact />,
      sortValue: (c) => c.type,
    },
    {
      key: "status",
      header: "Status",
      cell: (c) => <StatusBadge value={c.status} />,
      sortValue: (c) => c.status,
    },
    {
      key: "amount",
      header: user?.role === "PHARMACIST" ? "Pharmacy Amount" : "Claim Amount",
      cell: (c) => {
        if (user?.role === "PHARMACIST") {
          const pharmacyItem = c.billBreakdown?.find(
            (b) => b.departmentCategory === "PHARMACY"
          );
          return formatCurrency(pharmacyItem?.amount ?? 0);
        }
        return formatCurrency(c.totalClaimAmount);
      },
      sortValue: (c) => {
        if (user?.role === "PHARMACIST") {
          return (
            c.billBreakdown?.find((b) => b.departmentCategory === "PHARMACY")
              ?.amount ?? 0
          );
        }
        return c.totalClaimAmount;
      },
      className: "numeric",
    },
    {
      key: "age",
      header: "Ageing",
      cell: (c) => (
        <span className={ageInDays(c.createdAt) > 60 ? "danger-text" : ""}>
          {ageInDays(c.createdAt)} days
        </span>
      ),
      sortValue: (c) => ageInDays(c.createdAt),
    },
    {
      key: "department",
      header: "Department",
      cell: (c) =>
        typeof c.department === "object" && c.department
          ? c.department.name
          : "—",
      sortValue: (c) => nameOf(c.departmentId),
    },
    {
      key: "doctor",
      header: "Doctor",
      cell: (c) => {
        const name =
          typeof c.doctor === "object" && c.doctor ? c.doctor.name : null;
        return name ? `Dr. ${name}` : "—";
      },
      sortValue: (c) =>
        typeof c.doctor === "object" && c.doctor ? c.doctor.name : "",
    },
    {
      key: "created",
      header: "Created",
      cell: (c) => formatDate(c.createdAt),
      sortValue: (c) => c.createdAt,
    },
  ];

  if (query.isLoading) {
    return <Skeleton rows={8} />;
  }

  if (query.isError) {
    return <ErrorPanel error={query.error} />;
  }

  return (
    <div className="page-stack">
      <div className="page-title">
        <p className="eyebrow">Claims registry</p>
        <h1>All Claims Registry</h1>
        <span>Unfiltered, complete catalog of all claims processed.</span>
      </div>

      <DataTable
        title="Claims operational registry"
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id || row._id}
        onRowClick={(row) => navigate(`/claims/${row.id || row._id}`)}
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/claims")}
          >
            Back to Worklist
          </Button>
        }
      />
    </div>
  );
}
