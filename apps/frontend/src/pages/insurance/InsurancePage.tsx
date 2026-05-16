import { useQuery } from "@tanstack/react-query";
import { insuranceApi } from "../../api/services";
import { DataTable, type Column } from "../../components/tables/DataTable";
import { ErrorPanel } from "../../components/ui/ErrorPanel";
import { Skeleton } from "../../components/ui/Skeleton";
import { StatusBadge } from "../../components/ui/StatusBadge";
import type { InsuranceCompany } from "../../types/domain";
import { labelize } from "../../utils/format";
export function InsurancePage() { const query = useQuery({ queryKey: ["insurance"], queryFn: () => insuranceApi.list({ limit: 100 }) }); const columns: Column<InsuranceCompany>[] = [{ key: "name", header: "Company", cell: (c) => <strong>{c.name}</strong>, sortValue: (c) => c.name }, { key: "methods", header: "Submission", cell: (c) => c.submissionMethods.map((m) => <StatusBadge key={m} value={m} compact />), sortValue: (c) => c.submissionMethods.join(",") }, { key: "tat", header: "TAT", cell: (c) => `${c.tatDays ?? 0} days`, sortValue: (c) => c.tatDays ?? 0 }, { key: "contact", header: "Contact", cell: (c) => c.email ?? c.contactPersons[0]?.email ?? "—", sortValue: (c) => c.email ?? "" }, { key: "status", header: "Status", cell: (c) => labelize(c.isActive ? "ACTIVE" : "INACTIVE"), sortValue: (c) => String(c.isActive) }]; if (query.isLoading) return <Skeleton rows={8} />; if (query.isError) return <ErrorPanel error={query.error} />; const rows = query.data?.data ?? []; return <div className="page-stack"><div className="page-title"><p className="eyebrow">Payer master data</p><h1>Insurance Companies</h1><span>Submission channels, escalation matrix and operational TAT visibility.</span></div><DataTable rows={rows} columns={columns} getRowId={(row) => row._id} /></div>; }
