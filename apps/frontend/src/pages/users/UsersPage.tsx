import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../../api/services";
import { operationalRoles } from "../../constants/workflow";
import { DataTable, type Column } from "../../components/tables/DataTable";
import { ErrorPanel } from "../../components/ui/ErrorPanel";
import { Skeleton } from "../../components/ui/Skeleton";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import {
  Field,
  SelectInput,
  TextInput,
} from "../../components/forms/FormField";
import type { Role, User } from "../../types/domain";
import { formatDateTime } from "../../utils/format";
import { useAuthStore } from "../../store/auth.store";

type UserDraft = {
  fullName: string;
  email: string;
  password: string;
  role: Role;
  isActive: boolean;
};

const blank: UserDraft = {
  fullName: "",
  email: "",
  password: "",
  role: "CLAIM_EXECUTIVE",
  isActive: true,
};

export function UsersPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [draft, setDraft] = useState<UserDraft>(blank);
  const qc = useQueryClient();

  const currentUser = useAuthStore((s) => s.user);
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  const query = useQuery({
    queryKey: ["users"],
    queryFn: () => usersApi.list({ limit: 100 }),
  });

  const save = useMutation({
    mutationFn: () => {
      if (!editing) return usersApi.create(draft);
      const { password, ...rest } = draft;
      return usersApi.update(editing._id, password ? draft : rest);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      closeModal();
    },
  });

  const deactivate = useMutation({
    mutationFn: usersApi.deactivate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const openCreate = () => {
    setEditing(null);
    setDraft(blank);
    setModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setDraft({
      fullName: user.fullName,
      email: user.email,
      password: "",
      role: user.role,
      isActive: user.isActive,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setEditing(null);
    setDraft(blank);
    setModalOpen(false);
  };

  const columns: Column<User>[] = [
    {
      key: "name",
      header: "User",
      cell: (u) => <strong>{u.fullName}</strong>,
      sortValue: (u) => u.fullName,
      searchValue: (u) => `${u.fullName} ${u.email}`,
    },
    {
      key: "email",
      header: "Email",
      cell: (u) => u.email,
      sortValue: (u) => u.email,
      searchValue: (u) => u.email,
    },
    {
      key: "role",
      header: "Role",
      cell: (u) => <StatusBadge value={u.role} compact />,
      sortValue: (u) => u.role,
    },
    {
      key: "active",
      header: "Active",
      cell: (u) => (u.isActive ? "Active" : "Inactive"),
      sortValue: (u) => String(u.isActive),
    },
    {
      key: "created",
      header: "Created",
      cell: (u) => formatDateTime(u.createdAt),
      sortValue: (u) => u.createdAt ?? "",
    },
    // Only render Actions column if SUPER_ADMIN
    ...(isSuperAdmin
      ? ([
          {
            key: "actions",
            header: "Actions",
            cell: (u) => {
              const isSelf = u._id === currentUser?._id;
              return (
                <div className="chip-cloud">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => openEdit(u)}
                  >
                    Edit
                  </Button>
                  <Button
  type="button"
  variant={u.isActive ? "danger" : "success"}
  onClick={() =>
    u.isActive
      ? deactivate.mutate(u._id)
      : usersApi.update(u._id, { isActive: true }).then(() =>
          qc.invalidateQueries({ queryKey: ["users"] })
        )
  }
  disabled={isSelf || deactivate.isPending}
  title={isSelf ? "You cannot deactivate yourself" : undefined}
>
  {u.isActive ? "Deactivate" : "Activate"}
</Button>
                </div>
              );
            },
          },
        ] as Column<User>[])
      : []),
  ];

  if (query.isLoading) return <Skeleton rows={8} />;
  if (query.isError) return <ErrorPanel error={query.error} />;

  const rows = query.data?.data ?? [];

  return (
    <div className="page-stack">
      <div className="page-title">
        <p className="eyebrow">RBAC administration</p>
        <h1>Users</h1>
        <span>
          Role-controlled access for claim managers, executives, accountants and
          admins.
        </span>
      </div>

      <DataTable
        title="Access control matrix"
        rows={rows}
        columns={columns}
        getRowId={(row) => row._id}
        // Only show "New user" button for SUPER_ADMIN
        actions={
          isSuperAdmin ? (
            <Button type="button" onClick={openCreate}>
              New user
            </Button>
          ) : undefined
        }
      />

      <Modal
        open={modalOpen}
        title={editing ? "Update operator" : "Create operator"}
        onClose={closeModal}
      >
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div className="modal-body form-grid-2">
            <Field label="Full name">
              <TextInput
                required
                minLength={2}
                value={draft.fullName}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, fullName: e.target.value }))
                }
              />
            </Field>
            <Field label="Email">
              <TextInput
                required
                type="email"
                value={draft.email}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, email: e.target.value }))
                }
              />
            </Field>
            <Field label={editing ? "New password (optional)" : "Password"}>
              <TextInput
                required={!editing}
                minLength={8}
                type="password"
                value={draft.password}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, password: e.target.value }))
                }
              />
            </Field>
            <Field label="Role">
              <SelectInput
                value={draft.role}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, role: e.target.value as Role }))
                }
              >
                {operationalRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <label className="field">
              <span>Active</span>
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, isActive: e.target.checked }))
                }
              />
            </label>
          </div>
          <div className="modal-footer">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save user"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}