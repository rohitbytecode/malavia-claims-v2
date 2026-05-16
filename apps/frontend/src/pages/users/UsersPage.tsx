import { useQuery } from "@tanstack/react-query";
import { usersApi } from "../../api/services";
import { DataTable, type Column } from "../../components/tables/DataTable";
import { ErrorPanel } from "../../components/ui/ErrorPanel";
import { Skeleton } from "../../components/ui/Skeleton";
import { StatusBadge } from "../../components/ui/StatusBadge";
import type { User } from "../../types/domain";
import { formatDateTime } from "../../utils/format";
export function UsersPage() { const query = useQuery({ queryKey: ["users"], queryFn: () => usersApi.list({ limit: 100 }) }); const columns: Column<User>[] = [{ key: "name", header: "User", cell: (u) => <strong>{u.fullName}</strong>, sortValue: (u) => u.fullName }, { key: "email", header: "Email", cell: (u) => u.email, sortValue: (u) => u.email }, { key: "role", header: "Role", cell: (u) => <StatusBadge value={u.role} compact />, sortValue: (u) => u.role }, { key: "active", header: "Active", cell: (u) => u.isActive ? "Active" : "Inactive", sortValue: (u) => String(u.isActive) }, { key: "created", header: "Created", cell: (u) => formatDateTime(u.createdAt), sortValue: (u) => u.createdAt ?? "" }]; if (query.isLoading) return <Skeleton rows={8} />; if (query.isError) return <ErrorPanel error={query.error} />; const rows = query.data?.data ?? []; return <div className="page-stack"><div className="page-title"><p className="eyebrow">RBAC administration</p><h1>Users</h1><span>Role-controlled access for claim managers, executives, accountants and admins.</span></div><DataTable rows={rows} columns={columns} getRowId={(row) => row._id} /></div>; }
