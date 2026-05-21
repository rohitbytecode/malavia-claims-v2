import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";

import { claimsApi, patientApi } from "../../api/services";

import { ClaimCreatePanel } from "../../components/claims/ClaimCreatePanel";
import { DataTable, type Column } from "../../components/tables/DataTable";

import { ErrorPanel } from "../../components/ui/ErrorPanel";
import { Skeleton } from "../../components/ui/Skeleton";
import { StatusBadge } from "../../components/ui/StatusBadge";

import { claimStatuses, claimTypes } from "../../constants/workflow";

import type { Claim, ClaimStatus, ClaimType } from "../../types/domain";

import {
  ageInDays,
  formatCurrency,
  formatDate,
  nameOf,
} from "../../utils/format";

export function ClaimsListPage() {
  const navigate = useNavigate();

  const [params, setParams] = useSearchParams();

  const [search, setSearch] = useState("");

  const page = Number(params.get("page") ?? 1);

  const status = (params.get("status") || undefined) as ClaimStatus | undefined;

  const type = (params.get("type") || undefined) as ClaimType | undefined;

  // ✅ ALL hooks must be here, before any early returns

  const query = useQuery({
    queryKey: ["claims", page, status, type],
    queryFn: () =>
      claimsApi.list({
        page,
        limit: 20,
        status,
        type,
      }),
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

  const rows = useMemo(
    () =>
      (query.data?.data ?? []).filter((claim: Claim) =>
        [
          claim.id ?? "",
          claim.claimNumber ?? "",
          claim.patientId ?? "",
          claim.hospitalId ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [query.data, search]
  );

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
      header: "Claim Amount",

      cell: (c) => formatCurrency(c.totalClaimAmount),

      sortValue: (c) => c.totalClaimAmount,

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

        <h1>Claims Worklist</h1>

        <span>
          Advanced filters, compact sorting, ageing visibility and direct
          command-center navigation.
        </span>
      </div>

      <section className="filter-bar">
        <input
          className="input"
          placeholder="Search claim, patient or hospital"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="input"
          value={status ?? ""}
          onChange={(e) =>
            setParams((p) => {
              if (e.target.value) {
                p.set("status", e.target.value);
              } else {
                p.delete("status");
              }

              return p;
            })
          }
        >
          <option value="">All statuses</option>

          {claimStatuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        <select
          className="input"
          value={type ?? ""}
          onChange={(e) =>
            setParams((p) => {
              if (e.target.value) {
                p.set("type", e.target.value);
              } else {
                p.delete("type");
              }

              return p;
            })
          }
        >
          <option value="">All types</option>

          {claimTypes.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </section>

      <ClaimCreatePanel />

      <DataTable
        title="Claims operational registry"
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id || row._id}
        onRowClick={(row) => navigate(`/claims/${row.id || row._id}`)}
      />
    </div>
  );
}
