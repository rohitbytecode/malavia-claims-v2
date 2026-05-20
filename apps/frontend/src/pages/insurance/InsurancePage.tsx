import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { insuranceApi } from "../../api/services";
import { DataTable, type Column } from "../../components/tables/DataTable";
import { ErrorPanel } from "../../components/ui/ErrorPanel";
import { Skeleton } from "../../components/ui/Skeleton";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Field, TextArea, TextInput } from "../../components/forms/FormField";
import type { InsuranceCompany, SubmissionMethod } from "../../types/domain";
import { labelize } from "../../utils/format";

type CompanyDraft = {
  name: string;
  submissionMethods: SubmissionMethod[];
  portalUrl: string;
  portalUsername: string;
  portalPassword: string;
  email: string;
  courierAddress: string;
  tatDays: number;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  remarks: string;
  isActive: boolean;
};

const blank: CompanyDraft = {
  name: "",
  submissionMethods: ["PORTAL"],
  portalUrl: "",
  portalUsername: "",
  portalPassword: "",
  email: "",
  courierAddress: "",
  tatDays: 0,
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  remarks: "",
  isActive: true,
};

const methods: SubmissionMethod[] = ["PORTAL", "EMAIL", "COURIER"];

function toPayload(draft: CompanyDraft) {
  return {
    name: draft.name,
    submissionMethods: draft.submissionMethods,
    portalUrl: draft.portalUrl?.trim() || undefined,
    portalUsername: draft.portalUsername?.trim() || undefined,
    portalPassword: draft.portalPassword?.trim() || undefined,
    email: draft.email?.trim() || undefined,
    courierAddress: draft.courierAddress?.trim() || undefined,
    tatDays: Number(draft.tatDays) || 0,
    remarks: draft.remarks?.trim() || undefined,
    isActive: draft.isActive,
    contactPersons:
      draft.contactName && draft.contactEmail && draft.contactPhone
        ? [
            {
              name: draft.contactName,
              email: draft.contactEmail,
              phone: draft.contactPhone,
            },
          ]
        : [],
    escalationMatrix: [],
  };
}

export function InsurancePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InsuranceCompany | null>(null);
  const [draft, setDraft] = useState<CompanyDraft>(blank);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["insurance"],
    queryFn: () => insuranceApi.list({ limit: 100 }),
  });

  const save = useMutation({
    mutationFn: () =>
      editing
        ? insuranceApi.update(editing._id, toPayload(draft))
        : insuranceApi.create(toPayload(draft)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["insurance"] });
      closeModal();
    },
  });

  const toggle = useMutation({
    mutationFn: (company: InsuranceCompany) =>
      insuranceApi.update(company._id, { isActive: !company.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["insurance"] }),
  });

  const openCreate = () => {
    setEditing(null);
    setDraft(blank);
    setModalOpen(true);
  };

  const openEdit = (company: InsuranceCompany) => {
    const contact = company.contactPersons?.[0];
    setEditing(company);
    setDraft({
      name: company.name,
      submissionMethods: company.submissionMethods,
      portalUrl: company.portalUrl ?? "",
      portalUsername: company.portalUsername ?? "",
      portalPassword: "", // Force re-entry for security
      email: company.email ?? "",
      courierAddress: company.courierAddress ?? "",
      tatDays: company.tatDays ?? 0,
      contactName: contact?.name ?? "",
      contactEmail: contact?.email ?? "",
      contactPhone: contact?.phone ?? "",
      remarks: company.remarks ?? "",
      isActive: company.isActive,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setEditing(null);
    setDraft(blank);
    setModalOpen(false);
  };

  const toggleMethod = (method: SubmissionMethod) => {
    setDraft((d) => {
      const has = d.submissionMethods.includes(method);
      let next = has
        ? d.submissionMethods.filter((item) => item !== method)
        : [...d.submissionMethods, method];

      // Ensure at least one method
      if (next.length === 0) next = [method];

      return { ...d, submissionMethods: next };
    });
  };

  // Helper to check if method is selected
  const hasMethod = (method: SubmissionMethod) =>
    draft.submissionMethods.includes(method);

  const columns: Column<InsuranceCompany>[] = [
    { key: "name", header: "Company", cell: (c) => <strong>{c.name}</strong>, sortValue: (c) => c.name },
    {
      key: "methods",
      header: "Submission",
      cell: (c) => (
        <div className="chip-cloud">
          {c.submissionMethods.map((m) => (
            <StatusBadge key={m} value={m} compact />
          ))}
        </div>
      ),
      sortValue: (c) => c.submissionMethods.join(","),
    },
    {
      key: "tat",
      header: "TAT",
      cell: (c) => `${c.tatDays ?? 0} days`,
      sortValue: (c) => c.tatDays ?? 0,
    },
    {
      key: "contact",
      header: "Contact",
      cell: (c) => c.email ?? c.contactPersons?.[0]?.email ?? "—",
      sortValue: (c) => c.email ?? "",
    },
    {
      key: "status",
      header: "Status",
      cell: (c) => labelize(c.isActive ? "ACTIVE" : "INACTIVE"),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (c) => (
        <div className="chip-cloud">
          <Button variant="secondary" onClick={() => openEdit(c)}>
            Edit
          </Button>
          <Button
            variant={c.isActive ? "danger" : "success"}
            onClick={() => toggle.mutate(c)}
            disabled={toggle.isPending}
          >
            {c.isActive ? "Inactivate" : "Activate"}
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
        <p className="eyebrow">Payer master data</p>
        <h1>Insurance Companies</h1>
        <span>
          Submission channels, escalation matrix and operational TAT visibility.
        </span>
      </div>

      <DataTable
        title="Payer directory"
        rows={rows}
        columns={columns}
        getRowId={(row) => row._id}
        actions={<Button onClick={openCreate}>New payer</Button>}
        expandedRow={(row) => (
  <div className="form-grid-3">
    <div>
      <p className="eyebrow">Portal</p>
      {row.portalUrl ? (
        <a href={row.portalUrl} target="_blank" rel="noopener noreferrer"
        className="text-blue-600 hover:underline"> 
        <strong>{row.portalUrl}</strong>
        </a>
      ) : (
        <strong>Not configured</strong>
      )}
    </div>
    <div>
      <p className="eyebrow">Courier</p>
      <strong>{row.courierAddress ? row.courierAddress : "Not configured"}</strong>
    </div>
    <div>
      <p className="eyebrow">Escalations</p>
      <strong>{row.escalationMatrix?.length ?? 0} contacts</strong>
    </div>
  </div>
)}
      />

      <Modal
        open={modalOpen}
        title={editing ? "Update payer" : "Create payer"}
        onClose={closeModal}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="modal-body form-grid-2">
            {/* Basic Info */}
            <Field label="Company name">
              <TextInput
                required
                minLength={3}
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </Field>

            <Field label="TAT days">
              <TextInput
                type="number"
                min={0}
                value={draft.tatDays}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, tatDays: Number(e.target.value) || 0 }))
                }
              />
            </Field>

            {/* Submission Methods */}
            <div className="field col-span-2">
              <span>Submission methods</span>
              <div className="chip-cloud">
                {methods.map((method) => (
                  <label key={method} className="filter-chip">
                    <input
                      type="checkbox"
                      checked={hasMethod(method)}
                      onChange={() => toggleMethod(method)}
                    />{" "}
                    {method}
                  </label>
                ))}
              </div>
            </div>

            {/* Conditional Fields */}

            {hasMethod("EMAIL") && (
              <Field label="Email channel">
                <TextInput
                  type="email"
                  required
                  value={draft.email}
                  onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                />
              </Field>
            )}

            {hasMethod("PORTAL") && (
              <>
                <Field label="Portal URL">
                  <TextInput
                    type="url"
                    required
                    placeholder="https://"
                    value={draft.portalUrl}
                    onChange={(e) => setDraft((d) => ({ ...d, portalUrl: e.target.value }))}
                    pattern="https?://.*"
                    title="Must start with http:// or https://"
                  />
                </Field>

                <Field label="Portal username">
                  <TextInput
                    value={draft.portalUsername}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, portalUsername: e.target.value }))
                    }
                  />
                </Field>

                <Field label="Portal password">
                  <TextInput
                    type="password"
                    value={draft.portalPassword}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, portalPassword: e.target.value }))
                    }
                  />
                </Field>
              </>
            )}

            {hasMethod("COURIER") && (
              <div className="col-span-2">
                <Field label="Courier address">
                  <TextArea
                    required
                    value={draft.courierAddress}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, courierAddress: e.target.value }))
                    }
                  />
                </Field>
              </div>
            )}

            {/* Contact Info */}
            <Field label="Primary contact name">
              <TextInput
                value={draft.contactName}
                onChange={(e) => setDraft((d) => ({ ...d, contactName: e.target.value }))}
              />
            </Field>

            <Field label="Primary contact email">
              <TextInput
                type="email"
                value={draft.contactEmail}
                onChange={(e) => setDraft((d) => ({ ...d, contactEmail: e.target.value }))}
              />
            </Field>

            <Field label="Primary contact phone">
              <TextInput
                value={draft.contactPhone}
                onChange={(e) => setDraft((d) => ({ ...d, contactPhone: e.target.value }))}
              />
            </Field>

            <div className="col-span-2">
              <Field label="Remarks">
                <TextArea
                  value={draft.remarks}
                  onChange={(e) => setDraft((d) => ({ ...d, remarks: e.target.value }))}
                />
              </Field>
            </div>

            <label className="field">
              <span>Active</span>
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
              />
            </label>
          </div>

          <div className="modal-footer">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : editing ? "Update payer" : "Create payer"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}