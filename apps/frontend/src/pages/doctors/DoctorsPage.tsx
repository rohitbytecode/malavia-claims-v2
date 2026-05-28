import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { doctorApi, departmentApi } from "../../api/services";
import { DataTable, type Column } from "../../components/tables/DataTable";
import { ErrorPanel } from "../../components/ui/ErrorPanel";
import { Skeleton } from "../../components/ui/Skeleton";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import {
  Field,
  SelectInput,
  TextInput,
} from "../../components/forms/FormField";
import type { Doctor } from "../../types/domain";
import { useAuthStore } from "../../store/auth.store";

type DoctorDraft = {
  name: string;
  departmentId: string;
  isActive: boolean;
};

const blank: DoctorDraft = {
  name: "",
  departmentId: "",
  isActive: true,
};

export function DoctorsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [draft, setDraft] = useState<DoctorDraft>(blank);
  const [validationError, setValidationError] = useState<string | null>(null);
  const qc = useQueryClient();

  const user = useAuthStore((s) => s.user);
  const isPharmacist = user?.role === "PHARMACIST";

  const doctorsQuery = useQuery({
    queryKey: ["doctors"],
    queryFn: () => doctorApi.list({ limit: 100 }),
  });

  const departmentsQuery = useQuery({
    queryKey: ["departments", "active"],
    queryFn: () => departmentApi.list({ isActive: true, limit: 100 }),
  });

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: draft.name,
        departmentId: draft.departmentId,
        isActive: draft.isActive,
      };
      return editing
        ? doctorApi.update(editing._id || editing.id, payload)
        : doctorApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctors"] });
      closeModal();
    },
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      doctorApi.update(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctors"] });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setDraft(blank);
    setValidationError(null);
    setModalOpen(true);
  };

  const openEdit = (doctor: Doctor) => {
    const deptId =
      typeof doctor.department === "object" && doctor.department
        ? doctor.department._id
        : doctor.departmentId || "";
    setEditing(doctor);
    setDraft({
      name: doctor.name,
      departmentId: deptId,
      isActive: doctor.isActive,
    });
    setValidationError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setEditing(null);
    setDraft(blank);
    setValidationError(null);
    setModalOpen(false);
  };

  const validateName = (name: string): boolean => {
    const normalized = name.toLowerCase().trim();
    if (normalized.startsWith("dr.") || normalized.startsWith("dr ")) {
      setValidationError(
        "Doctor name should not start with 'Dr.' or 'dr.' prefix"
      );
      return false;
    }
    setValidationError(null);
    return true;
  };

  const columns: Column<Doctor>[] = [
    {
      key: "name",
      header: "Name",
      cell: (d) => <strong>Dr. {d.name}</strong>,
      sortValue: (d) => d.name,
      searchValue: (d) => d.name,
    },
    {
      key: "department",
      header: "Department Name",
      cell: (d) => {
        if (typeof d.department === "object" && d.department) {
          return d.department.name;
        }
        return "—";
      },
      sortValue: (d) => {
        if (typeof d.department === "object" && d.department) {
          return d.department.name;
        }
        return "";
      },
      searchValue: (d) => {
        if (typeof d.department === "object" && d.department) {
          return d.department.name;
        }
        return "";
      },
    },
    {
      key: "active",
      header: "Active",
      cell: (d) => (d.isActive ? "Yes" : "No"),
      sortValue: (d) => String(d.isActive),
    },
    {
      key: "actions",
      header: isPharmacist ? "" : "Actions",
      cell: (d) => (
        <div className="chip-cloud">
          {!isPharmacist && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => openEdit(d)}
            >
              Edit
            </Button>
          )}
          {!isPharmacist && (
            <Button
              type="button"
              variant={d.isActive ? "danger" : "success"}
              onClick={() =>
                toggleStatus.mutate({
                  id: d._id || d.id,
                  isActive: !d.isActive,
                })
              }
              disabled={toggleStatus.isPending}
            >
              {d.isActive ? "Deactivate" : "Activate"}
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (doctorsQuery.isLoading) return <Skeleton rows={8} />;
  if (doctorsQuery.isError) return <ErrorPanel error={doctorsQuery.error} />;

  const rows = doctorsQuery.data?.data ?? [];
  const departments = departmentsQuery.data?.data ?? [];

  return (
    <div className="page-stack">
      <div className="page-title">
        <p className="eyebrow">Operations data center</p>
        <h1>Doctors</h1>
        <span>Register and manage doctors with corresponding departments.</span>
      </div>

      <DataTable
        title="Doctor directory"
        rows={rows}
        columns={columns}
        getRowId={(row) => row._id || row.id}
        actions={
          !isPharmacist && (
            <Button type="button" onClick={openCreate}>
              New doctor
            </Button>
          )
        }
      />

      <Modal
        open={modalOpen}
        title={editing ? "Update Doctor Details" : "Register New Doctor"}
        onClose={closeModal}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!validateName(draft.name)) return;
            save.mutate();
          }}
        >
          <div className="modal-body form-grid-2">
            <Field label="Doctor Name" error={validationError || undefined}>
              <TextInput
                required
                minLength={2}
                placeholder="Name (e.g. John Doe - without 'Dr.')"
                value={draft.name}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, name: e.target.value }));
                  validateName(e.target.value);
                }}
              />
            </Field>
            <Field label="Department">
              <SelectInput
                required
                value={draft.departmentId}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, departmentId: e.target.value }))
                }
              >
                <option value="">Select department...</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
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
              {save.isPending ? "Saving…" : "Save doctor"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
