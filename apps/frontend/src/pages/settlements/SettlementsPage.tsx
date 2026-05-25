import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { claimsApi, patientApi } from "../../api/services";
import { DataTable, type Column } from "../../components/tables/DataTable";
import { ErrorPanel } from "../../components/ui/ErrorPanel";
import { Skeleton } from "../../components/ui/Skeleton";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import type { Claim } from "../../types/domain";
import { formatCurrency, formatDate } from "../../utils/format";

export function SettlementsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const query = useQuery({
    queryKey: ["claims", "settlement-pending"],
    queryFn: () =>
      claimsApi.list({
        limit: 100,
        status: "SETTLEMENT_PENDING",
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
          patientMap.get(claim.patientId) ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [query.data, search, patientMap]
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
      header: "Patient",
      cell: (c) => <strong>{patientMap.get(c.patientId) ?? "Unknown"}</strong>,
      sortValue: (c) => patientMap.get(c.patientId) ?? "Unknown",
    },
    {
      key: "type",
      header: "Type",
      cell: (c) => <StatusBadge value={c.type} compact />,
      sortValue: (c) => c.type,
    },
    {
      key: "amount",
      header: "Claim Amount",
      cell: (c) => formatCurrency(c.totalClaimAmount),
      sortValue: (c) => c.totalClaimAmount,
      className: "numeric",
    },
    {
      key: "created",
      header: "Created Date",
      cell: (c) => formatDate(c.createdAt),
      sortValue: (c) => c.createdAt,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (c) => (
        <Button
          type="button"
          variant="secondary"
          className="no-print"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/claims/${c.id || c._id}`);
          }}
        >
          Open Cockpit
        </Button>
      ),
    },
  ];

  const handlePrint = () => {
    window.print();
  };

  if (query.isLoading) {
    return <Skeleton rows={8} />;
  }

  if (query.isError) {
    return <ErrorPanel error={query.error} />;
  }

  return (
    <div className="page-stack">
      <div
        className="page-title"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div>
          <p className="eyebrow">Finance operations</p>
          <h1>Settlements Worklist</h1>
          <span>
            Showing all claims awaiting settlement execution and finance
            allocation.
          </span>
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={handlePrint}
          className="no-print"
          style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
        >
          <span>⎙</span> Print PDF
        </Button>
      </div>

      <section className="filter-bar no-print">
        <input
          className="input"
          placeholder="Search claim or patient name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: "400px" }}
        />
      </section>

      <DataTable
        title="Settlement Pending Claims"
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id || row._id}
        onRowClick={(row) => navigate(`/claims/${row.id || row._id}`)}
      />
    </div>
  );
}
