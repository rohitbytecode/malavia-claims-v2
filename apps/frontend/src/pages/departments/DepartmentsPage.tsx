import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { departmentApi } from "../../api/services";
import { DataTable, type Column } from "../../components/tables/DataTable";
import { ErrorPanel } from "../../components/ui/ErrorPanel";
import { Skeleton } from "../../components/ui/Skeleton";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Field, TextArea, TextInput } from "../../components/forms/FormField";
import type { Department } from "../../types/domain";

type DepartmentDraft = {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
};

const blank: DepartmentDraft = {
  name: "",
  code: "",
  description: "",
  isActive: true,
};

export function DepartmentsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [draft, setDraft] = useState<DepartmentDraft>(blank);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["departments"],
    queryFn: () => departmentApi.list({ limit: 100 }),
  });

  const save = useMutation({
    mutationFn: () =>
      editing
        ? departmentApi.update(editing._id, draft)
        : departmentApi.create(draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      closeModal();
    },
  });

  // New: Toggle Active / Inactive
  const toggleStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      departmentApi.update(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setDraft(blank);
    setModalOpen(true);
  };

  const openEdit = (department: Department) => {
    setEditing(department);
    setDraft({
      name: department.name,
      code: department.code,
      description: department.description ?? "",
      isActive: department.isActive,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setEditing(null);
    setDraft(blank);
    setModalOpen(false);
  };

  const columns: Column<Department>[] = [
    {
      key: "code",
      header: "Code",
      cell: (d) => <strong>{d.code}</strong>,
      sortValue: (d) => d.code,
      searchValue: (d) => d.code,
    },
    {
      key: "name",
      header: "Department",
      cell: (d) => d.name,
      sortValue: (d) => d.name,
      searchValue: (d) => d.name,
    },
    {
      key: "description",
      header: "Description",
      cell: (d) => d.description ?? "—",
      sortValue: (d) => d.description ?? "",
      searchValue: (d) => d.description ?? "",
    },
    {
      key: "active",
      header: "Active",
      cell: (d) => (d.isActive ? "Yes" : "No"),
      sortValue: (d) => String(d.isActive),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (d) => (
        <div className="chip-cloud">
          <Button 
            type="button" 
            variant="secondary" 
            onClick={() => openEdit(d)}
          >
            Edit
          </Button>

          <Button
            type="button"
            variant={d.isActive ? "danger" : "success"}   // Green when inactive
            className={d.isActive ? "" : "bg-green-600 hover:bg-green-700 text-white"}
            onClick={() => 
              toggleStatus.mutate({ 
                id: d._id, 
                isActive: !d.isActive 
              })
            }
            disabled={toggleStatus.isPending}
          >
            {d.isActive ? "Inactivate" : "Activate"}
          </Button>
        </div>
      ),
    },
  ];

  if (query.isLoading) return <Skeleton rows={8} />;
  if (query.isError) return <ErrorPanel error={query.error} />;

  const rows = query.data?.data ?? [];

  return (
    <div className="page-stack">
      <div className="page-title">
        <p className="eyebrow">Cost center master</p>
        <h1>Departments</h1>
        <span>
          Allocation-ready department records used by settlement distribution.
        </span>
      </div>

      <DataTable
        title="Department master"
        rows={rows}
        columns={columns}
        getRowId={(row) => row._id}
        actions={
          <Button type="button" onClick={openCreate}>
            New department
          </Button>
        }
      />

      <Modal
        open={modalOpen}
        title={editing ? "Update department" : "Create department"}
        onClose={closeModal}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="modal-body form-grid-2">
            <Field label="Code">
              <TextInput
                required
                value={draft.code}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, code: e.target.value }))
                }
              />
            </Field>
            <Field label="Name">
              <TextInput
                required
                minLength={2}
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
              />
            </Field>
            <Field label="Description">
              <TextArea
                value={draft.description}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, description: e.target.value }))
                }
              />
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
              {save.isPending ? "Saving…" : "Save department"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}