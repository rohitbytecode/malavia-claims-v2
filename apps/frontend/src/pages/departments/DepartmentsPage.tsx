import { useQuery } from "@tanstack/react-query";
import { departmentApi } from "../../api/services";
import { DataTable, type Column } from "../../components/tables/DataTable";
import { ErrorPanel } from "../../components/ui/ErrorPanel";
import { Skeleton } from "../../components/ui/Skeleton";
import type { Department } from "../../types/domain";
export function DepartmentsPage() { const query = useQuery({ queryKey: ["departments"], queryFn: () => departmentApi.list({ limit: 100 }) }); const columns: Column<Department>[] = [{ key: "code", header: "Code", cell: (d) => <strong>{d.code}</strong>, sortValue: (d) => d.code }, { key: "name", header: "Department", cell: (d) => d.name, sortValue: (d) => d.name }, { key: "description", header: "Description", cell: (d) => d.description ?? "—", sortValue: (d) => d.description ?? "" }, { key: "active", header: "Active", cell: (d) => d.isActive ? "Yes" : "No", sortValue: (d) => String(d.isActive) }]; if (query.isLoading) return <Skeleton rows={8} />; if (query.isError) return <ErrorPanel error={query.error} />; const rows = query.data?.data ?? []; return <div className="page-stack"><div className="page-title"><p className="eyebrow">Cost center master</p><h1>Departments</h1><span>Allocation-ready department records used by settlement distribution.</span></div><DataTable rows={rows} columns={columns} getRowId={(row) => row._id} /></div>; }
