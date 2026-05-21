import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { patientApi, insuranceApi } from "../../api/services";
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
import type { Patient } from "../../types/domain";

type PatientDraft = {
  patientId: string;
  name: string;
  insurerId: string;
  insuranceCompanyId: string;
  isActive: boolean;
};

const blank: PatientDraft = {
  patientId: "",
  name: "",
  insurerId: "",
  insuranceCompanyId: "",
  isActive: true,
};

export function PatientsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [draft, setDraft] = useState<PatientDraft>(blank);
  const qc = useQueryClient();

  const patientsQuery = useQuery({
    queryKey: ["patients"],
    queryFn: () => patientApi.list({ limit: 100 }),
  });

  const insuranceQuery = useQuery({
    queryKey: ["insurance", "active"],
    queryFn: () => insuranceApi.list({ isActive: true, limit: 100 }),
  });

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        patientId: draft.patientId,
        name: draft.name,
        insurerId: draft.insurerId || null,
        insuranceCompanyId: draft.insuranceCompanyId || null,
        isActive: draft.isActive,
      };
      return editing
        ? patientApi.update(editing._id, payload)
        : patientApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      closeModal();
    },
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      patientApi.update(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setDraft(blank);
    setModalOpen(true);
  };

  const openEdit = (patient: Patient) => {
    const insurerId =
      typeof patient.insuranceCompany === "object" && patient.insuranceCompany
        ? patient.insuranceCompany._id
        : patient.insuranceCompanyId || "";
    setEditing(patient);
    setDraft({
      patientId: patient.patientId,
      name: patient.name,
      insurerId: patient.insurerId || "",
      insuranceCompanyId: insurerId,
      isActive: patient.isActive,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setEditing(null);
    setDraft(blank);
    setModalOpen(false);
  };

  const columns: Column<Patient>[] = [
    {
      key: "patientId",
      header: "Patient ID",
      cell: (p) => <strong>{p.patientId}</strong>,
      sortValue: (p) => p.patientId,
      searchValue: (p) => p.patientId,
    },
    {
      key: "name",
      header: "Name",
      cell: (p) => p.name,
      sortValue: (p) => p.name,
      searchValue: (p) => p.name,
    },
    {
      key: "insurerId",
      header: "Insurer ID",
      cell: (p) => p.insurerId || "—",
      sortValue: (p) => p.insurerId || "",
      searchValue: (p) => p.insurerId || "",
    },
    {
      key: "insurer",
      header: "Insurance Company",
      cell: (p) => {
        if (typeof p.insuranceCompany === "object" && p.insuranceCompany) {
          return p.insuranceCompany.name;
        }
        return "—";
      },
      sortValue: (p) => {
        if (typeof p.insuranceCompany === "object" && p.insuranceCompany) {
          return p.insuranceCompany.name;
        }
        return "";
      },
      searchValue: (p) => {
        if (typeof p.insuranceCompany === "object" && p.insuranceCompany) {
          return p.insuranceCompany.name;
        }
        return "";
      },
    },
    {
      key: "active",
      header: "Active",
      cell: (p) => (p.isActive ? "Yes" : "No"),
      sortValue: (p) => String(p.isActive),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (p) => (
        <div className="chip-cloud">
          <Button type="button" variant="secondary" onClick={() => openEdit(p)}>
            Edit
          </Button>

          <Button
            type="button"
            variant={p.isActive ? "danger" : "success"}
            onClick={() =>
              toggleStatus.mutate({
                id: p._id,
                isActive: !p.isActive,
              })
            }
            disabled={toggleStatus.isPending}
          >
            {p.isActive ? "Inactivate" : "Activate"}
          </Button>
        </div>
      ),
    },
  ];

  if (patientsQuery.isLoading) return <Skeleton rows={8} />;
  if (patientsQuery.isError) return <ErrorPanel error={patientsQuery.error} />;

  const rows = patientsQuery.data?.data ?? [];
  const insurers = insuranceQuery.data?.data ?? [];

  return (
    <div className="page-stack">
      <div className="page-title">
        <p className="eyebrow">Operations data center</p>
        <h1>Patients</h1>
        <span>
          Register and manage patients with corresponding patient IDs and
          insurance providers.
        </span>
      </div>

      <DataTable
        title="Patient directory"
        rows={rows}
        columns={columns}
        getRowId={(row) => row._id}
        actions={
          <Button type="button" onClick={openCreate}>
            New patient
          </Button>
        }
      />

      <Modal
        open={modalOpen}
        title={editing ? "Update Patient Details" : "Register New Patient"}
        onClose={closeModal}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="modal-body form-grid-2">
            <Field label="Patient ID">
              <TextInput
                required
                placeholder="e.g. PAT-1002"
                value={draft.patientId}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, patientId: e.target.value }))
                }
              />
            </Field>
            <Field label="Name">
              <TextInput
                required
                minLength={2}
                placeholder="Full Name"
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
              />
            </Field>
            <Field label="Insurer ID">
              <TextInput
                placeholder="e.g. INS-443322"
                value={draft.insurerId}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, insurerId: e.target.value }))
                }
              />
            </Field>
            <Field label="Insurance Company">
              <SelectInput
                value={draft.insuranceCompanyId}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    insuranceCompanyId: e.target.value,
                  }))
                }
              >
                <option value="">Select insurance company...</option>
                {insurers.map((ins) => (
                  <option key={ins._id} value={ins._id}>
                    {ins.name}
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
              {save.isPending ? "Saving…" : "Save patient"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
