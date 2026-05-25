import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { payerContractApi, DEPARTMENT_CATEGORIES } from "../../api/services";
import { useAuthStore } from "../../store/auth.store";
import type {
  DepartmentCategory,
  DepartmentPolicyItem,
  PayerContract,
} from "../../types/domain";
import { formatDateTime, labelize } from "../../utils/format";
import { Button } from "../ui/Button";
import { ErrorPanel } from "../ui/ErrorPanel";
import { Modal } from "../ui/Modal";
import { StatusBadge } from "../ui/StatusBadge";

interface PayerContractPanelProps {
  insuranceCompanyId: string;
  companyName: string;
}

type Draft = {
  effectiveFrom: string;
  effectiveTo: string;
  tdsPercent: number;
  defaultHospitalDiscountPercent: number;
  remarks: string;
  departmentPolicies: DepartmentPolicyItem[];
};

const blankDraft = (): Draft => ({
  effectiveFrom: new Date().toISOString().slice(0, 10),
  effectiveTo: "",
  tdsPercent: 0,
  defaultHospitalDiscountPercent: 0,
  remarks: "",
  departmentPolicies: DEPARTMENT_CATEGORIES.map((c) => ({
    departmentCategory: c.value as DepartmentCategory,
    discountPercent: 0,
    isApplicable: true,
  })),
});

export function PayerContractPanel({
  insuranceCompanyId,
  companyName,
}: PayerContractPanelProps) {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PayerContract | null>(null);
  const [draft, setDraft] = useState<Draft>(blankDraft());

  const contracts = useQuery({
    queryKey: ["payer-contracts", insuranceCompanyId],
    queryFn: () => payerContractApi.listByCompany(insuranceCompanyId),
  });

  const save = useMutation({
    mutationFn: () =>
      editing
        ? payerContractApi.update(editing._id, {
            effectiveFrom: draft.effectiveFrom,
            effectiveTo: draft.effectiveTo || null,
            tdsPercent: draft.tdsPercent,
            defaultHospitalDiscountPercent:
              draft.defaultHospitalDiscountPercent,
            remarks: draft.remarks,
            departmentPolicies: draft.departmentPolicies,
          })
        : payerContractApi.create({
            insuranceCompanyId,
            effectiveFrom: draft.effectiveFrom,
            effectiveTo: draft.effectiveTo || undefined,
            tdsPercent: draft.tdsPercent,
            defaultHospitalDiscountPercent:
              draft.defaultHospitalDiscountPercent,
            remarks: draft.remarks,
            departmentPolicies: draft.departmentPolicies,
            createdBy: user?._id ?? "",
          }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["payer-contracts", insuranceCompanyId],
      });
      qc.invalidateQueries({
        queryKey: ["payer-contract-active", insuranceCompanyId],
      });
      closeModal();
    },
  });

  const toggleActive = useMutation({
    mutationFn: (contract: PayerContract) =>
      payerContractApi.update(contract._id, { isActive: !contract.isActive }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["payer-contracts", insuranceCompanyId],
      });
      qc.invalidateQueries({
        queryKey: ["payer-contract-active", insuranceCompanyId],
      });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => payerContractApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["payer-contracts", insuranceCompanyId],
      });
      qc.invalidateQueries({
        queryKey: ["payer-contract-active", insuranceCompanyId],
      });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setDraft(blankDraft());
    setModalOpen(true);
  };

  const openEdit = (c: PayerContract) => {
    setEditing(c);
    const policiesMap = new Map(
      c.departmentPolicies.map((p) => [p.departmentCategory, p])
    );
    setDraft({
      effectiveFrom: c.effectiveFrom?.slice(0, 10) ?? "",
      effectiveTo: c.effectiveTo?.slice(0, 10) ?? "",
      tdsPercent: c.tdsPercent,
      defaultHospitalDiscountPercent: c.defaultHospitalDiscountPercent,
      remarks: c.remarks ?? "",
      departmentPolicies: DEPARTMENT_CATEGORIES.map((cat) => {
        const existing = policiesMap.get(cat.value);
        return {
          departmentCategory: cat.value as DepartmentCategory,
          discountPercent: existing?.discountPercent ?? 0,
          maxDiscountAmount: existing?.maxDiscountAmount,
          deductionRules: existing?.deductionRules ?? "",
          isApplicable: existing?.isApplicable ?? true,
        };
      }),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setEditing(null);
    setDraft(blankDraft());
    setModalOpen(false);
  };

  const updatePolicy = (
    idx: number,
    field: keyof DepartmentPolicyItem,
    value: unknown
  ) => {
    setDraft((d) => {
      const policies = [...d.departmentPolicies];
      policies[idx] = { ...policies[idx], [field]: value };
      return { ...d, departmentPolicies: policies };
    });
  };

  const getCatLabel = (cat: string) =>
    DEPARTMENT_CATEGORIES.find((c) => c.value === cat)?.label ?? labelize(cat);

  const rows = contracts.data ?? [];

  return (
    <div className="page-stack" style={{ gap: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <p className="eyebrow">Payer Contract Engine</p>
          <h3 style={{ margin: 0 }}>
            Deduction &amp; Discount Policies — {companyName}
          </h3>
          <small style={{ color: "var(--text-secondary)" }}>
            Define department-wise discount percentages, TDS, and hospital
            discount defaults for this insurance company.
          </small>
        </div>
        <Button onClick={openCreate}>New Contract</Button>
      </div>

      {contracts.isError && <ErrorPanel error={contracts.error} />}

      {rows.length === 0 && !contracts.isLoading && (
        <div
          style={{
            padding: "24px 20px",
            background: "color-mix(in srgb, var(--amber) 6%, transparent)",
            border:
              "1px solid color-mix(in srgb, var(--amber) 20%, transparent)",
            borderRadius: "var(--r-lg)",
            fontSize: 13,
            color: "var(--text-secondary)",
          }}
        >
          <strong style={{ display: "block", marginBottom: 4 }}>
            No contracts defined yet
          </strong>
          Create a payer contract to define department-wise discount/deduction
          policies for this insurance company.
        </div>
      )}

      {rows.map((contract) => (
        <div
          key={contract._id}
          className="premium-panel"
          style={{
            padding: 16,
            borderLeft: contract.isActive
              ? "3px solid var(--green)"
              : "3px solid var(--text-tertiary)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 12,
            }}
          >
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <StatusBadge
                  value={contract.isActive ? "ACTIVE" : "INACTIVE"}
                  compact
                />
                <strong style={{ fontSize: 14 }}>
                  Effective from{" "}
                  {contract.effectiveFrom
                    ? new Date(contract.effectiveFrom).toLocaleDateString()
                    : "—"}
                  {contract.effectiveTo
                    ? ` to ${new Date(contract.effectiveTo).toLocaleDateString()}`
                    : ""}
                </strong>
              </div>
              <small style={{ color: "var(--text-tertiary)", fontSize: 11 }}>
                TDS: {contract.tdsPercent}% · Hospital Discount:{" "}
                {contract.defaultHospitalDiscountPercent}% · Created{" "}
                {formatDateTime(contract.createdAt)}
              </small>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Button variant="secondary" onClick={() => openEdit(contract)}>
                Edit
              </Button>
              <Button
                variant={contract.isActive ? "danger" : "success"}
                onClick={() => toggleActive.mutate(contract)}
                disabled={toggleActive.isPending}
              >
                {contract.isActive ? "Deactivate" : "Activate"}
              </Button>
              <Button
                variant="danger"
                onClick={() => remove.mutate(contract._id)}
                disabled={remove.isPending}
              >
                ✕
              </Button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 8,
            }}
          >
            {contract.departmentPolicies
              .filter((p) => p.isApplicable)
              .map((p) => (
                <div
                  key={p.departmentCategory}
                  style={{
                    padding: "8px 12px",
                    background:
                      "color-mix(in srgb, var(--accent-primary) 6%, transparent)",
                    borderRadius: "var(--r-md)",
                    fontSize: 12,
                  }}
                >
                  <strong>{getCatLabel(p.departmentCategory)}</strong>
                  <div style={{ color: "var(--text-secondary)", marginTop: 2 }}>
                    Discount: {p.discountPercent}%
                    {p.maxDiscountAmount
                      ? ` (max ₹${p.maxDiscountAmount})`
                      : ""}
                  </div>
                  {p.deductionRules && (
                    <div
                      style={{ color: "var(--text-tertiary)", marginTop: 2 }}
                    >
                      {p.deductionRules}
                    </div>
                  )}
                </div>
              ))}
          </div>
          {contract.remarks && (
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              Notes: {contract.remarks}
            </div>
          )}
        </div>
      ))}

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        title={editing ? "Edit Payer Contract" : "New Payer Contract"}
        onClose={closeModal}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div
            className="modal-body"
            style={{ maxHeight: "70vh", overflowY: "auto" }}
          >
            <div className="form-grid-2" style={{ marginBottom: 16 }}>
              <label className="field">
                <span>Effective From</span>
                <input
                  className="input"
                  type="date"
                  value={draft.effectiveFrom}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, effectiveFrom: e.target.value }))
                  }
                  required
                />
              </label>
              <label className="field">
                <span>Effective To (optional)</span>
                <input
                  className="input"
                  type="date"
                  value={draft.effectiveTo}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, effectiveTo: e.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>TDS %</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={draft.tdsPercent}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      tdsPercent: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Default Hospital Discount %</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={draft.defaultHospitalDiscountPercent}
                  onChange={(e) => {
                    const newVal = Number(e.target.value);
                    const oldVal = draft.defaultHospitalDiscountPercent;
                    setDraft((d) => {
                      const updatedPolicies = d.departmentPolicies.map((p) => {
                        if (p.discountPercent === 0 || p.discountPercent === oldVal) {
                          return { ...p, discountPercent: newVal };
                        }
                        return p;
                      });
                      return {
                        ...d,
                        defaultHospitalDiscountPercent: newVal,
                        departmentPolicies: updatedPolicies,
                      };
                    });
                  }}
                />
              </label>
            </div>

            <p className="eyebrow" style={{ marginBottom: 8 }}>
              Department-wise Discount Policies
            </p>
            <div
              style={{
                display: "grid",
                gap: 8,
              }}
            >
              {draft.departmentPolicies.map((policy, idx) => (
                <div
                  key={policy.departmentCategory}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 100px 120px 1fr auto",
                    gap: 8,
                    alignItems: "center",
                    padding: "8px 12px",
                    background: policy.isApplicable
                      ? "color-mix(in srgb, var(--accent-primary) 4%, transparent)"
                      : "color-mix(in srgb, var(--text-tertiary) 4%, transparent)",
                    borderRadius: "var(--r-md)",
                    fontSize: 13,
                    opacity: policy.isApplicable ? 1 : 0.5,
                  }}
                >
                  <strong>{getCatLabel(policy.departmentCategory)}</strong>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    value={policy.discountPercent}
                    onChange={(e) =>
                      updatePolicy(
                        idx,
                        "discountPercent",
                        Number(e.target.value)
                      )
                    }
                    placeholder="Discount %"
                    style={{ fontSize: 12, padding: "4px 8px" }}
                    disabled={!policy.isApplicable}
                  />
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={policy.maxDiscountAmount ?? ""}
                    onChange={(e) =>
                      updatePolicy(
                        idx,
                        "maxDiscountAmount",
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    placeholder="Max ₹"
                    style={{ fontSize: 12, padding: "4px 8px" }}
                    disabled={!policy.isApplicable}
                  />
                  <input
                    className="input"
                    type="text"
                    value={policy.deductionRules ?? ""}
                    onChange={(e) =>
                      updatePolicy(idx, "deductionRules", e.target.value)
                    }
                    placeholder="Deduction rules / notes"
                    style={{ fontSize: 12, padding: "4px 8px" }}
                    disabled={!policy.isApplicable}
                  />
                  <label
                    style={{
                      display: "flex",
                      gap: 4,
                      alignItems: "center",
                      cursor: "pointer",
                      fontSize: 11,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={policy.isApplicable}
                      onChange={(e) =>
                        updatePolicy(idx, "isApplicable", e.target.checked)
                      }
                    />
                    Active
                  </label>
                </div>
              ))}
            </div>

            <label className="field" style={{ marginTop: 12 }}>
              <span>Remarks</span>
              <textarea
                className="input textarea"
                value={draft.remarks}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, remarks: e.target.value }))
                }
                rows={2}
                placeholder="Additional notes about this contract..."
              />
            </label>
          </div>

          <div className="modal-footer">
            {save.isError && <ErrorPanel error={save.error} />}
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending
                ? "Saving…"
                : editing
                  ? "Update Contract"
                  : "Create Contract"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
