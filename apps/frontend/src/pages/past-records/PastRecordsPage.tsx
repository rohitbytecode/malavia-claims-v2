import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  pastRecordsApi,
  insuranceApi,
  departmentApi,
  doctorApi,
  DEPARTMENT_CATEGORIES,
} from "../../api/services";
import { claimStatuses, claimTypes } from "../../constants/workflow";
import { Button } from "../../components/ui/Button";
import {
  Field,
  TextInput,
  SelectInput,
} from "../../components/forms/FormField";
import type { ClaimStatus, ClaimType } from "../../types/domain";
import { apiErrorMessage } from "../../api/client";
import { formatCurrency } from "../../utils/format";

const VENDOR_DEPARTMENTS = ["PHARMACY", "LABORATORY", "RADIOLOGY"];

interface DeptLineDraft {
  departmentCategory: string;
  claimedAmount: number;
  approvedAmount: number;
  deduction: number;
  companyDiscountPercent: number;
  companyDiscountAmount: number;
  vendorDiscountPercent: number;
  vendorDiscountAmount: number;
  netAmount: number; // Company Net
  vendorPayout: number;
  hospitalShare: number;
  remarks: string;
}

interface PastRecordDraft {
  patientId: string;
  patientName: string;
  insurerId: string;
  insuranceCompanyId: string;
  claimNumber: string;
  claimType: ClaimType;
  claimStatus: ClaimStatus;
  claimDate: string;
  departmentId: string;
  doctorId: string;
  totalClaimAmount: number;
  tdsAmount: number;
  deductions: number;
  hospitalDiscount: number;
  depositAmount: number;
  refundAmount: number;
  remarks: string;

  // Advanced settlement fields
  settlementMethod: string;
  settlementDate: string;
  refundStatus: string;
}

const blank: PastRecordDraft = {
  patientId: "",
  patientName: "",
  insurerId: "",
  insuranceCompanyId: "",
  claimNumber: "",
  claimType: "CASHLESS",
  claimStatus: "DRAFT",
  claimDate: "",
  departmentId: "",
  doctorId: "",
  totalClaimAmount: 0,
  tdsAmount: 0,
  deductions: 0,
  hospitalDiscount: 0,
  depositAmount: 0,
  refundAmount: 0,
  remarks: "",

  settlementMethod: "PORTAL",
  settlementDate: "",
  refundStatus: "PENDING",
};

export function PastRecordsPage() {
  const [draft, setDraft] = useState<PastRecordDraft>({ ...blank });
  const [deptLines, setDeptLines] = useState<DeptLineDraft[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);

  const insuranceQuery = useQuery({
    queryKey: ["insurance-companies", "all"],
    queryFn: () => insuranceApi.list({ limit: 100 }),
  });

  const departmentQuery = useQuery({
    queryKey: ["departments", "all"],
    queryFn: () => departmentApi.list({ limit: 100 }),
  });

  const doctorQuery = useQuery({
    queryKey: ["doctors", "all"],
    queryFn: () => doctorApi.list({ limit: 100 }),
  });

  const insuranceCompanies = insuranceQuery.data?.data ?? [];
  const departments = departmentQuery.data?.data ?? [];
  const doctors = doctorQuery.data?.data ?? [];

  const selectedInsuranceName = insuranceCompanies.find(
    (c) => c._id === draft.insuranceCompanyId
  )?.name;
  const selectedDepartmentName = departments.find(
    (d) => d._id === draft.departmentId
  )?.name;
  const selectedDoctorName = doctors.find(
    (d) => d._id === draft.doctorId
  )?.name;

  const needsBreakdown =
    draft.claimStatus === "SETTLED" ||
    draft.claimStatus === "SETTLEMENT_PENDING";

  const isSettled = draft.claimStatus === "SETTLED";

  // Compute live calculations
  const computedTotals = useMemo(() => {
    const totalClaimed = deptLines.reduce((s, l) => s + l.claimedAmount, 0);
    const totalApproved = deptLines.reduce((s, l) => s + l.approvedAmount, 0);
    const totalDeductions = deptLines.reduce((s, l) => s + l.deduction, 0);
    const totalCompanyDiscount = deptLines.reduce(
      (s, l) => s + l.companyDiscountAmount,
      0
    );
    const totalVendorPayout = deptLines.reduce((s, l) => s + l.vendorPayout, 0);
    const totalHospitalShare = deptLines.reduce(
      (s, l) => s + l.hospitalShare,
      0
    );

    const activeApproved =
      isSettled && deptLines.length > 0
        ? totalApproved
        : draft.totalClaimAmount;
    const activeCompanyDiscount =
      isSettled && deptLines.length > 0
        ? totalCompanyDiscount
        : draft.hospitalDiscount;
    const activeDeductions =
      isSettled && deptLines.length > 0 ? totalDeductions : draft.deductions;
    const activeNet = Math.max(0, activeApproved - activeCompanyDiscount);

    const extraRefund = Math.max(0, draft.refundAmount - draft.depositAmount);
    const netPayable = Math.max(0, activeNet - draft.tdsAmount - extraRefund);
    const hospitalNetShare =
      Math.round((netPayable - totalVendorPayout) * 100) / 100;

    return {
      totalClaimed,
      totalApproved: activeApproved,
      totalDeductions: activeDeductions,
      totalCompanyDiscount: activeCompanyDiscount,
      totalVendorPayout,
      totalHospitalShare,
      activeNet,
      netPayable,
      hospitalNetShare,
    };
  }, [
    deptLines,
    isSettled,
    draft.totalClaimAmount,
    draft.hospitalDiscount,
    draft.deductions,
    draft.tdsAmount,
    draft.refundAmount,
    draft.depositAmount,
  ]);

  // Sync basic claim fields to matching totals when using department breakdown
  useEffect(() => {
    if (needsBreakdown && deptLines.length > 0) {
      if (isSettled) {
        setDraft((d) => ({
          ...d,
          totalClaimAmount: computedTotals.totalClaimed,
          deductions: computedTotals.totalDeductions,
          hospitalDiscount: computedTotals.totalCompanyDiscount,
        }));
      } else {
        setDraft((d) => ({
          ...d,
          totalClaimAmount: computedTotals.totalClaimed,
        }));
      }
    }
  }, [
    computedTotals.totalClaimed,
    computedTotals.totalDeductions,
    computedTotals.totalCompanyDiscount,
    needsBreakdown,
    isSettled,
    deptLines.length,
  ]);

  const importMutation = useMutation({
    mutationFn: () =>
      pastRecordsApi.import({
        patientId: draft.patientId,
        patientName: draft.patientName,
        insurerId: draft.insurerId || undefined,
        insuranceCompanyName: selectedInsuranceName || undefined,
        claimNumber: draft.claimNumber,
        claimType: draft.claimType,
        claimStatus: draft.claimStatus,
        claimDate: draft.claimDate || undefined,
        departmentName: selectedDepartmentName || undefined,
        doctorName: selectedDoctorName || undefined,
        totalClaimAmount: isSettled
          ? computedTotals.totalApproved
          : computedTotals.totalClaimed,
        tdsAmount: isSettled ? draft.tdsAmount || undefined : undefined,
        deductions: isSettled
          ? computedTotals.totalDeductions || undefined
          : undefined,
        hospitalDiscount: isSettled
          ? computedTotals.totalCompanyDiscount || undefined
          : undefined,
        depositAmount: draft.depositAmount || undefined,
        refundAmount: draft.refundAmount || undefined,
        remarks: draft.remarks || undefined,

        // Advanced settlement fields
        settlementMethod: isSettled
          ? draft.settlementMethod || undefined
          : undefined,
        settlementDate: isSettled
          ? draft.settlementDate || undefined
          : undefined,
        totalCompanyDiscount: isSettled
          ? computedTotals.totalCompanyDiscount
          : undefined,
        totalVendorPayout: isSettled
          ? computedTotals.totalVendorPayout
          : undefined,
        hospitalNetShare: isSettled
          ? computedTotals.hospitalNetShare
          : undefined,
        refundStatus: draft.refundStatus || undefined,
        departmentBreakdown: needsBreakdown ? deptLines : undefined,
      }),
    onSuccess: () => {
      setSuccessMessage(
        `Record for claim "${draft.claimNumber}" imported successfully!`
      );
      setErrorMessage(null);
      setImportedCount((c) => c + 1);
      setDraft({ ...blank });
      setDeptLines([]);
    },
    onError: (err) => {
      setErrorMessage(apiErrorMessage(err));
      setSuccessMessage(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);
    importMutation.mutate();
  };

  const set = <K extends keyof PastRecordDraft>(
    key: K,
    value: PastRecordDraft[K]
  ) => setDraft((d) => ({ ...d, [key]: value }));

  // Auto-calculate dynamic lines when values change
  const handleLineValueChange = (
    index: number,
    field: keyof DeptLineDraft,
    val: number | string
  ) => {
    setDeptLines((prev) => {
      const next = [...prev];
      const updated = { ...next[index], [field]: val } as DeptLineDraft;

      const isVendor = VENDOR_DEPARTMENTS.includes(updated.departmentCategory);

      // 1. If claimed/approved amount changed, recalculate deduction
      if (field === "claimedAmount" || field === "approvedAmount") {
        updated.deduction = Math.max(
          0,
          updated.claimedAmount - updated.approvedAmount
        );
      }

      // 2. If approvedAmount or companyDiscountPercent changed, recalculate companyDiscountAmount
      if (field === "approvedAmount" || field === "companyDiscountPercent") {
        updated.companyDiscountAmount =
          Math.round(
            ((updated.approvedAmount * updated.companyDiscountPercent) / 100) *
              100
          ) / 100;
      }
      // If companyDiscountAmount changed manually, recalculate percent
      else if (field === "companyDiscountAmount") {
        updated.companyDiscountPercent =
          updated.approvedAmount > 0
            ? Math.round(
                (updated.companyDiscountAmount / updated.approvedAmount) *
                  100 *
                  100
              ) / 100
            : 0;
      }

      // Recalculate netAmount
      updated.netAmount =
        Math.round(
          (updated.approvedAmount - updated.companyDiscountAmount) * 100
        ) / 100;

      // 3. If approvedAmount or vendorDiscountPercent changed, recalculate vendorDiscountAmount
      if (field === "approvedAmount" || field === "vendorDiscountPercent") {
        updated.vendorDiscountAmount =
          Math.round(
            ((updated.approvedAmount * updated.vendorDiscountPercent) / 100) *
              100
          ) / 100;
      }
      // If vendorDiscountAmount changed manually, recalculate percent
      else if (field === "vendorDiscountAmount") {
        updated.vendorDiscountPercent =
          updated.approvedAmount > 0
            ? Math.round(
                (updated.vendorDiscountAmount / updated.approvedAmount) *
                  100 *
                  100
              ) / 100
            : 0;
      }

      // Recalculate vendorPayout
      updated.vendorPayout = isVendor
        ? Math.max(
            0,
            Math.round(
              (updated.approvedAmount - updated.vendorDiscountAmount) * 100
            ) / 100
          )
        : 0;

      // Recalculate hospitalShare
      updated.hospitalShare = isVendor
        ? Math.round(
            (updated.vendorDiscountAmount - updated.companyDiscountAmount) * 100
          ) / 100
        : updated.netAmount;

      next[index] = updated;
      return next;
    });
  };

  // Add/remove rows from department breakdown
  const handleAddDeptRow = (category: string) => {
    if (deptLines.some((l) => l.departmentCategory === category)) return;
    const newLine: DeptLineDraft = {
      departmentCategory: category,
      claimedAmount: 0,
      approvedAmount: 0,
      deduction: 0,
      companyDiscountPercent: 0,
      companyDiscountAmount: 0,
      vendorDiscountPercent: 0,
      vendorDiscountAmount: 0,
      netAmount: 0,
      vendorPayout: 0,
      hospitalShare: 0,
      remarks: "",
    };
    setDeptLines((prev) => [...prev, newLine]);
  };

  const handleRemoveDeptRow = (index: number) => {
    setDeptLines((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="page-stack">
      <div className="page-title">
        <p className="eyebrow">Administration</p>
        <h1>Import Past Records</h1>
        <span>
          Import historical patient and claim records into the system. This will
          create or update Patient, Claim, Status History, Settlement, and
          Deposit records with backdated timestamps.
        </span>
      </div>

      {successMessage && (
        <div
          className="alert-banner"
          style={{
            background: "rgba(16, 185, 129, 0.12)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            borderRadius: "var(--radius-lg, 12px)",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            color: "var(--emerald, #10b981)",
            fontWeight: 500,
          }}
        >
          <span style={{ fontSize: "1.3em" }}>✓</span>
          <span>{successMessage}</span>
          <span
            className="text-muted"
            style={{ marginLeft: "auto", fontSize: "0.85em" }}
          >
            {importedCount} record{importedCount !== 1 ? "s" : ""} imported this
            session
          </span>
        </div>
      )}

      {errorMessage && (
        <div
          className="alert-banner"
          style={{
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "var(--radius-lg, 12px)",
            padding: "16px 20px",
            color: "var(--red, #ef4444)",
            fontWeight: 500,
          }}
        >
          <span style={{ fontSize: "1.3em" }}>✗</span> {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Patient Details */}
        <fieldset
          className="card"
          style={{ marginBottom: "20px", minWidth: 0 }}
        >
          <legend
            style={{
              fontWeight: 600,
              fontSize: "1.05em",
              color: "var(--text-main)",
              padding: "0 8px",
            }}
          >
            Patient Details
          </legend>
          <div className="form-grid-3" style={{ padding: "16px" }}>
            <Field label="Patient ID *">
              <TextInput
                required
                placeholder="e.g. T-P-5"
                value={draft.patientId}
                onChange={(e) => set("patientId", e.target.value)}
              />
            </Field>
            <Field label="Patient Name *">
              <TextInput
                required
                placeholder="Full name"
                value={draft.patientName}
                onChange={(e) => set("patientName", e.target.value)}
              />
            </Field>
            <Field label="Insurer ID">
              <TextInput
                placeholder="e.g. IL0910205179000"
                value={draft.insurerId}
                onChange={(e) => set("insurerId", e.target.value)}
              />
            </Field>
            <Field label="Insurance Company">
              <SelectInput
                value={draft.insuranceCompanyId}
                onChange={(e) => set("insuranceCompanyId", e.target.value)}
              >
                <option value="">-Select —</option>
                {insuranceCompanies.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
        </fieldset>

        {/* Claim Details */}
        <fieldset
          className="card"
          style={{ marginBottom: "20px", minWidth: 0 }}
        >
          <legend
            style={{
              fontWeight: 600,
              fontSize: "1.05em",
              color: "var(--text-main)",
              padding: "0 8px",
            }}
          >
            Claim Details
          </legend>
          <div className="form-grid-3" style={{ padding: "16px" }}>
            <Field label="Claim Number *">
              <TextInput
                required
                placeholder="e.g. AL-110202460068"
                value={draft.claimNumber}
                onChange={(e) => set("claimNumber", e.target.value)}
              />
            </Field>
            <Field label="Claim Type *">
              <SelectInput
                value={draft.claimType}
                onChange={(e) => set("claimType", e.target.value as ClaimType)}
              >
                {claimTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Claim Status *">
              <SelectInput
                value={draft.claimStatus}
                onChange={(e) =>
                  set("claimStatus", e.target.value as ClaimStatus)
                }
              >
                {claimStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Claim Date">
              <TextInput
                type="date"
                value={draft.claimDate}
                onChange={(e) => set("claimDate", e.target.value)}
              />
            </Field>
            <Field label="Department">
              <SelectInput
                value={draft.departmentId}
                onChange={(e) => set("departmentId", e.target.value)}
              >
                <option value="">-Select —</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Doctor">
              <SelectInput
                value={draft.doctorId}
                onChange={(e) => set("doctorId", e.target.value)}
              >
                <option value="">-Select —</option>
                {doctors.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
        </fieldset>

        {/* Dynamic Department Settlement Breakdown Section */}
        {needsBreakdown && (
          <fieldset
            className="card"
            style={{ marginBottom: "20px", minWidth: 0 }}
          >
            <legend
              style={{
                fontWeight: 600,
                fontSize: "1.05em",
                color: "var(--text-main)",
                padding: "0 8px",
              }}
            >
              Department Breakdown & Finance Metrics
            </legend>
            <div style={{ padding: "16px" }}>
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  marginBottom: "16px",
                  background: "rgba(255,255,255,0.03)",
                  padding: "10px 14px",
                  borderRadius: "8px",
                }}
              >
                <span style={{ fontSize: "0.95em", fontWeight: 500 }}>
                  Add Department:
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  {DEPARTMENT_CATEGORIES.map((cat) => {
                    const exists = deptLines.some(
                      (l) => l.departmentCategory === cat.value
                    );
                    return (
                      <Button
                        key={cat.value}
                        type="button"
                        variant={exists ? "secondary" : "primary"}
                        style={{
                          padding: "4px 8px",
                          fontSize: "0.85em",
                          minHeight: "auto",
                          opacity: exists ? 0.4 : 1,
                        }}
                        disabled={exists}
                        onClick={() => handleAddDeptRow(cat.value)}
                      >
                        + {cat.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {deptLines.length === 0 ? (
                <div
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "var(--text-muted)",
                    background: "rgba(0,0,0,0.1)",
                    borderRadius: "6px",
                    border: "1px dashed rgba(255,255,255,0.1)",
                  }}
                >
                  No department breakdown lines added yet. Click one of the
                  buttons above to add rows.
                </div>
              ) : (
                <div style={{ overflowX: "auto", width: "100%" }}>
                  <table
                    className="data-table"
                    style={{
                      width: "100%",
                      fontSize: "0.85em",
                      borderCollapse: "collapse",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <th style={{ padding: "8px", textAlign: "left" }}>
                          Dept
                        </th>
                        <th style={{ padding: "8px" }}>Claimed (₹)</th>
                        <th style={{ padding: "8px" }}>Approved (₹)</th>
                        <th style={{ padding: "8px" }}>Deduction (₹)</th>
                        <th style={{ padding: "8px" }}>Co. Disc % / Amt (₹)</th>
                        <th style={{ padding: "8px" }}>
                          Vend. Disc % / Amt (₹)
                        </th>
                        <th style={{ padding: "8px" }}>Co. Net (₹)</th>
                        <th style={{ padding: "8px" }}>Vend. Payout (₹)</th>
                        <th style={{ padding: "8px" }}>Hosp. Share (₹)</th>
                        <th style={{ padding: "8px" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deptLines.map((line, index) => {
                        const isVendor = VENDOR_DEPARTMENTS.includes(
                          line.departmentCategory
                        );
                        return (
                          <tr
                            key={line.departmentCategory}
                            style={{
                              borderBottom: "1px solid rgba(255,255,255,0.05)",
                            }}
                          >
                            <td style={{ padding: "6px 8px", fontWeight: 600 }}>
                              {line.departmentCategory}
                            </td>
                            <td style={{ padding: "6px 8px" }}>
                              <TextInput
                                type="number"
                                step="any"
                                required
                                min={0}
                                style={{ width: "70px", padding: "4px" }}
                                value={line.claimedAmount}
                                onChange={(e) =>
                                  handleLineValueChange(
                                    index,
                                    "claimedAmount",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </td>
                            <td style={{ padding: "6px 8px" }}>
                              <TextInput
                                type="number"
                                step="any"
                                required
                                min={0}
                                style={{ width: "70px", padding: "4px" }}
                                value={line.approvedAmount}
                                onChange={(e) =>
                                  handleLineValueChange(
                                    index,
                                    "approvedAmount",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </td>
                            <td style={{ padding: "6px 8px" }}>
                              <TextInput
                                type="number"
                                step="any"
                                min={0}
                                style={{ width: "65px", padding: "4px" }}
                                value={line.deduction}
                                onChange={(e) =>
                                  handleLineValueChange(
                                    index,
                                    "deduction",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </td>
                            <td style={{ padding: "6px 8px" }}>
                              <div style={{ display: "flex", gap: "4px" }}>
                                <TextInput
                                  type="number"
                                  step="any"
                                  min={0}
                                  max={100}
                                  placeholder="%"
                                  style={{ width: "45px", padding: "4px" }}
                                  value={line.companyDiscountPercent}
                                  onChange={(e) =>
                                    handleLineValueChange(
                                      index,
                                      "companyDiscountPercent",
                                      Number(e.target.value)
                                    )
                                  }
                                />
                                <TextInput
                                  type="number"
                                  step="any"
                                  min={0}
                                  placeholder="Amt"
                                  style={{ width: "60px", padding: "4px" }}
                                  value={line.companyDiscountAmount}
                                  onChange={(e) =>
                                    handleLineValueChange(
                                      index,
                                      "companyDiscountAmount",
                                      Number(e.target.value)
                                    )
                                  }
                                />
                              </div>
                            </td>
                            <td style={{ padding: "6px 8px" }}>
                              <div style={{ display: "flex", gap: "4px" }}>
                                <TextInput
                                  type="number"
                                  step="any"
                                  min={0}
                                  max={100}
                                  placeholder="%"
                                  disabled={!isVendor}
                                  style={{ width: "45px", padding: "4px" }}
                                  value={line.vendorDiscountPercent}
                                  onChange={(e) =>
                                    handleLineValueChange(
                                      index,
                                      "vendorDiscountPercent",
                                      Number(e.target.value)
                                    )
                                  }
                                />
                                <TextInput
                                  type="number"
                                  step="any"
                                  min={0}
                                  placeholder="Amt"
                                  disabled={!isVendor}
                                  style={{ width: "60px", padding: "4px" }}
                                  value={line.vendorDiscountAmount}
                                  onChange={(e) =>
                                    handleLineValueChange(
                                      index,
                                      "vendorDiscountAmount",
                                      Number(e.target.value)
                                    )
                                  }
                                />
                              </div>
                            </td>
                            <td style={{ padding: "6px 8px" }}>
                              <TextInput
                                type="number"
                                step="any"
                                min={0}
                                style={{ width: "70px", padding: "4px" }}
                                value={line.netAmount}
                                onChange={(e) =>
                                  handleLineValueChange(
                                    index,
                                    "netAmount",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </td>
                            <td style={{ padding: "6px 8px" }}>
                              <TextInput
                                type="number"
                                step="any"
                                min={0}
                                disabled={!isVendor}
                                style={{ width: "70px", padding: "4px" }}
                                value={line.vendorPayout}
                                onChange={(e) =>
                                  handleLineValueChange(
                                    index,
                                    "vendorPayout",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </td>
                            <td style={{ padding: "6px 8px" }}>
                              <TextInput
                                type="number"
                                step="any"
                                style={{ width: "70px", padding: "4px" }}
                                value={line.hospitalShare}
                                onChange={(e) =>
                                  handleLineValueChange(
                                    index,
                                    "hospitalShare",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </td>
                            <td
                              style={{
                                padding: "6px 8px",
                                textAlign: "center",
                              }}
                            >
                              <Button
                                type="button"
                                variant="danger"
                                style={{
                                  padding: "2px 6px",
                                  fontSize: "0.9em",
                                  minHeight: "auto",
                                }}
                                onClick={() => handleRemoveDeptRow(index)}
                              >
                                ✕
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </fieldset>
        )}

        {/* Financial & Settlement Overall Details */}
        <fieldset
          className="card"
          style={{ marginBottom: "20px", minWidth: 0 }}
        >
          <legend
            style={{
              fontWeight: 600,
              fontSize: "1.05em",
              color: "var(--text-main)",
              padding: "0 8px",
            }}
          >
            Financial & Settlement Summary
          </legend>
          <div className="form-grid-3" style={{ padding: "16px" }}>
            <Field label="Total Claimed Amount *">
              <TextInput
                type="number"
                step="any"
                required
                min={0}
                value={draft.totalClaimAmount}
                onChange={(e) =>
                  set("totalClaimAmount", Number(e.target.value))
                }
              />
            </Field>
            <Field label="Total Approved Amount">
              <div
                style={{
                  padding: "8px 12px",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: "6px",
                  fontWeight: 600,
                  fontSize: "1.1em",
                }}
              >
                {formatCurrency(computedTotals.totalApproved)}
              </div>
            </Field>
            <Field label="Total Deductions">
              <div
                style={{
                  padding: "8px 12px",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: "6px",
                }}
              >
                {formatCurrency(computedTotals.totalDeductions)}
              </div>
            </Field>
            <Field label="Company Discount (Payer) / Hospital Discount">
              <div
                style={{
                  padding: "8px 12px",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: "6px",
                }}
              >
                {formatCurrency(computedTotals.totalCompanyDiscount)}
              </div>
            </Field>
            <Field label="TDS Amount">
              <TextInput
                type="number"
                step="any"
                min={0}
                value={draft.tdsAmount}
                onChange={(e) => set("tdsAmount", Number(e.target.value))}
              />
            </Field>
            <Field label="Net Payable from Company (Before TDS)">
              <div
                style={{
                  padding: "8px 12px",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: "6px",
                }}
              >
                {formatCurrency(computedTotals.activeNet)}
              </div>
            </Field>
            <Field label="Net Payable from Company (After TDS)">
              <div
                style={{
                  padding: "8px 12px",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: "6px",
                  fontWeight: 700,
                  color: "var(--accent-primary)",
                }}
              >
                {formatCurrency(computedTotals.netPayable)}
              </div>
            </Field>
            <Field label="Total Vendor Payout">
              <div
                style={{
                  padding: "8px 12px",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: "6px",
                }}
              >
                {formatCurrency(computedTotals.totalVendorPayout)}
              </div>
            </Field>
            <Field label="Net Hospital Share (Before TDS)">
              <div
                style={{
                  padding: "8px 12px",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: "6px",
                  fontWeight: 600,
                  color: "var(--emerald)",
                }}
              >
                {formatCurrency(
                  computedTotals.hospitalNetShare + draft.tdsAmount
                )}
              </div>
            </Field>
            <Field label="Net Hospital Share (After TDS)">
              <div
                style={{
                  padding: "8px 12px",
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  borderRadius: "6px",
                  fontWeight: 700,
                  color: "var(--emerald)",
                }}
              >
                {formatCurrency(computedTotals.hospitalNetShare)}
              </div>
            </Field>
            <Field label="Deposit Amount">
              <TextInput
                type="number"
                step="any"
                min={0}
                value={draft.depositAmount}
                onChange={(e) => set("depositAmount", Number(e.target.value))}
              />
            </Field>
            <Field label="Refund Amount">
              <TextInput
                type="number"
                step="any"
                min={0}
                value={draft.refundAmount}
                onChange={(e) => set("refundAmount", Number(e.target.value))}
              />
            </Field>
            <Field label="Refund Status">
              <SelectInput
                value={draft.refundStatus}
                onChange={(e) => set("refundStatus", e.target.value)}
              >
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Completed</option>
              </SelectInput>
            </Field>

            {isSettled && (
              <>
                <Field label="Settlement Method">
                  <SelectInput
                    value={draft.settlementMethod}
                    onChange={(e) => set("settlementMethod", e.target.value)}
                  >
                    <option value="PORTAL">Portal</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="NEFT">NEFT</option>
                    <option value="RTGS">RTGS</option>
                    <option value="OTHER">Other</option>
                  </SelectInput>
                </Field>
                <Field label="Settlement Date">
                  <TextInput
                    type="date"
                    value={draft.settlementDate}
                    onChange={(e) => set("settlementDate", e.target.value)}
                  />
                </Field>
              </>
            )}
          </div>
        </fieldset>

        {/* Remarks */}
        <fieldset
          className="card"
          style={{ marginBottom: "20px", minWidth: 0 }}
        >
          <legend
            style={{
              fontWeight: 600,
              fontSize: "1.05em",
              color: "var(--text-main)",
              padding: "0 8px",
            }}
          >
            Remarks
          </legend>
          <div style={{ padding: "16px" }}>
            <Field label="Notes / Remarks">
              <textarea
                className="input textarea"
                rows={3}
                placeholder="Any notes about this historical record..."
                value={draft.remarks}
                onChange={(e) => set("remarks", e.target.value)}
                style={{ width: "100%", resize: "vertical" }}
              />
            </Field>
          </div>
        </fieldset>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            marginTop: "8px",
          }}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setDraft({ ...blank });
              setDeptLines([]);
              setSuccessMessage(null);
              setErrorMessage(null);
            }}
          >
            Reset Form
          </Button>
          <Button type="submit" disabled={importMutation.isPending}>
            {importMutation.isPending ? "Importing…" : "Import Past Record"}
          </Button>
        </div>
      </form>
    </div>
  );
}
