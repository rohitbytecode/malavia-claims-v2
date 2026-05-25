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
  username: string;
  role: Role;
  isActive: boolean;
};

const blank: UserDraft = {
  fullName: "",
  username: "",
  role: "CLAIM_EXECUTIVE",
  isActive: true,
};

export function UsersPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [draft, setDraft] = useState<UserDraft>(blank);
  const [createdUserTempPassword, setCreatedUserTempPassword] = useState<
    string | null
  >(null);
  const [createdUserUsername, setCreatedUserUsername] = useState<string | null>(null);
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
      return usersApi.update(editing._id, draft);
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      closeModal();
      if (!editing && data?.tempPassword) {
        setCreatedUserTempPassword(data.tempPassword);
        setCreatedUserUsername(data.username);
      }
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
      username: user.username,
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
      searchValue: (u) => `${u.fullName} ${u.username}`,
    },
    {
      key: "username",
      header: "Username",
      cell: (u) => u.username,
      sortValue: (u) => u.username,
      searchValue: (u) => u.username,
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
                        : usersApi
                            .update(u._id, { isActive: true })
                            .then(() =>
                              qc.invalidateQueries({ queryKey: ["users"] })
                            )
                    }
                    disabled={isSelf || deactivate.isPending}
                    title={
                      isSelf ? "You cannot deactivate yourself" : undefined
                    }
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
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
            <Field label="Username">
              <TextInput
                required
                value={draft.username}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, username: e.target.value }))
                }
              />
            </Field>
            <Field label="Role">
              <SelectInput
                disabled={editing?._id === currentUser?._id}
                value={draft.role}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, role: e.target.value as Role }))
                }
              >
                {operationalRoles
                  .filter((r) => !editing || r === editing.role || r !== "SUPER_ADMIN")
                  .map((role) => (
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
                disabled={editing?._id === currentUser?._id}
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

      {createdUserTempPassword && (
        <Modal
          open={!!createdUserTempPassword}
          title="User Created Successfully"
          onClose={() => {
            setCreatedUserTempPassword(null);
            setCreatedUserUsername(null);
          }}
        >
          <div className="modal-body page-stack">
            <p>
              The system has automatically generated a secure password for the
              new user.
            </p>
            <div
              className="alert alert-success"
              style={{
                padding: "16px",
                borderRadius: "6px",
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div>
                <span className="text-muted" style={{ fontSize: "0.85em" }}>
                  Username:
                </span>
                <div
                  style={{
                    fontWeight: "bold",
                    fontSize: "1.15em",
                    color: "var(--text-main, #fff)",
                  }}
                >
                  {createdUserUsername}
                </div>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: "0.85em" }}>
                  Temporary Password:
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "4px",
                  }}
                >
                  <code
                    style={{
                      fontSize: "1.25em",
                      background: "rgba(0,0,0,0.3)",
                      padding: "6px 12px",
                      borderRadius: "4px",
                      letterSpacing: "1px",
                      color: "var(--amber, #f59e0b)",
                      fontFamily: "monospace",
                    }}
                  >
                    {createdUserTempPassword}
                  </code>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      navigator.clipboard.writeText(createdUserTempPassword)
                    }
                    style={{ padding: "4px 8px", minHeight: "auto" }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>
            <p
              style={{
                fontSize: "0.85em",
                color: "var(--text-muted, #888)",
                marginTop: "8px",
              }}
            >
              Please share this temporary password with the user. They will be
              forced to change their password or can change it from their
              settings.
            </p>
          </div>
          <div className="modal-footer">
            <Button
              type="button"
              onClick={() => {
                setCreatedUserTempPassword(null);
                setCreatedUserUsername(null);
              }}
            >
              Close & Proceed
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
