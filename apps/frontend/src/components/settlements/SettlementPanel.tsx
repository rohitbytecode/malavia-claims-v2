import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  settlementApi,
  allocationApi,
  depositApi,
  payerContractApi,
  DEPARTMENT_CATEGORIES,
} from "../../api/services";
import { useAuthStore } from "../../store/auth.store";
import type {
  Claim,
  SettlementMethod,
  SettlementDepartmentBreakdown,
  PayerContract,
  DepartmentPolicyItem,
} from "../../types/domain";

const VENDOR_DEPARTMENTS: string[] = ["PHARMACY", "LABORATORY", "RADIOLOGY"];

interface SettlementLineState extends SettlementDepartmentBreakdown {
  companyDiscountPercent: number;
  companyDiscountAmount: number;
  vendorDiscountPercent: number;
  vendorDiscountAmount: number;
  vendorPayout: number;
  hospitalShare: number;
  companyDiscountSource: "DEFAULT" | "MANUAL";
  vendorDiscountSource: "POLICY" | "DEFAULT" | "MANUAL";
}

import { formatCurrency, formatDateTime, labelize } from "../../utils/format";
import { Button } from "../ui/Button";
import { ErrorPanel } from "../ui/ErrorPanel";

function getInsuranceCompanyId(claim: Claim): string | undefined {
  const comp = (claim as any).insuranceCompany || claim.insuranceCompanyId;
  if (!comp) return undefined;
  if (typeof comp === "string") return comp;
  return comp._id ?? comp.id;
}

export function SettlementPanel({ claim }: { claim: Claim }) {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const settlement = useQuery({
    queryKey: ["settlement", claim.id],
    queryFn: () => settlementApi.getByClaim(claim.id),
    retry: false,
  });

  const insuranceCompanyId = getInsuranceCompanyId(claim);

  const contractQuery = useQuery({
    queryKey: ["payer-contract-active", insuranceCompanyId],
    queryFn: () => payerContractApi.getActive(insuranceCompanyId!),
    enabled: Boolean(insuranceCompanyId),
    retry: false,
  });

  const billBreakdown = claim.billBreakdown ?? [];
  const contract: PayerContract | null | undefined = contractQuery.data;
  const hasBillBreakdown = billBreakdown.length > 0;

  // Initialize department lines from bill breakdown
  const [deptLines, setDeptLines] = useState<SettlementLineState[]>([]);
  const [method, setMethod] = useState<SettlementMethod>("PORTAL");
  const [hospitalDiscount, setHospitalDiscount] = useState(0);
  const [tds, setTds] = useState(0);
  const isTdsUserEdited = useRef(false);
  const [refundAmount, setRefundAmount] = useState(claim.depositAmount || 0);

  // Build initial department lines when data is available
  useEffect(() => {
    if (billBreakdown.length > 0) {
      const policyMap = new Map<string, DepartmentPolicyItem>(
        (contract?.departmentPolicies ?? []).flatMap((p) =>
          p.isApplicable !== false
            ? [[p.departmentCategory, p] as [string, DepartmentPolicyItem]]
            : []
        )
      );

      const lines: SettlementLineState[] = billBreakdown.flatMap((b) => {
        if (b.amount <= 0) return [];
        const policy = policyMap.get(b.departmentCategory);
        const claimed = b.amount;
        const approved = claimed;

        // Company Discount (given to insurance company)
        const companyDiscountPercent =
          contract?.defaultHospitalDiscountPercent || 0;
        const companyDiscountAmount =
          Math.round(((approved * companyDiscountPercent) / 100) * 100) / 100;
        const netAmount =
          Math.round((approved - companyDiscountAmount) * 100) / 100;

        // Vendor Discount (deducted from vendor payout)
        const hasDeptPolicy = policy !== undefined;
        const vendorDiscountPercent = hasDeptPolicy
          ? policy.discountPercent
          : contract?.defaultHospitalDiscountPercent || 0;
        const vendorDiscountSource = hasDeptPolicy ? "POLICY" : "DEFAULT";

        let vendorDiscountAmount = (approved * vendorDiscountPercent) / 100;
        if (
          policy?.maxDiscountAmount &&
          vendorDiscountAmount > policy.maxDiscountAmount
        ) {
          vendorDiscountAmount = policy.maxDiscountAmount;
        }
        vendorDiscountAmount = Math.round(vendorDiscountAmount * 100) / 100;

        const isVendorDept = VENDOR_DEPARTMENTS.includes(b.departmentCategory);
        const vendorPayout = isVendorDept
          ? Math.max(
              0,
              Math.round((approved - vendorDiscountAmount) * 100) / 100
            )
          : 0;

        const hospitalShare = isVendorDept
          ? Math.round((vendorDiscountAmount - companyDiscountAmount) * 100) /
            100
          : netAmount;

        return {
          departmentCategory: b.departmentCategory,
          claimedAmount: claimed,
          approvedAmount: approved,
          deduction: Math.max(0, claimed - approved),
          // Backward compatibility fields:
          discountPercent: companyDiscountPercent,
          discountAmount: companyDiscountAmount,
          netAmount,
          // New explicit fields:
          companyDiscountPercent,
          companyDiscountAmount,
          vendorDiscountPercent,
          vendorDiscountAmount,
          vendorPayout,
          hospitalShare,
          companyDiscountSource: "DEFAULT",
          vendorDiscountSource,
          remarks: "",
        };
      });
      setDeptLines(lines);

      if (contract) {
        const initialTotalNet = lines.reduce(
          (sum, line) => sum + line.netAmount,
          0
        );
        const initialTds = Math.round(
          (initialTotalNet * (contract.tdsPercent || 0)) / 100
        );
        setTds(initialTds);
      }
    } else {
      if (contract) {
        const defaultDiscountPct = contract.defaultHospitalDiscountPercent || 0;
        const initialDiscount = Math.round(
          (claim.totalClaimAmount * defaultDiscountPct) / 100
        );
        setHospitalDiscount(initialDiscount);

        const netAfterDiscount = Math.max(
          0,
          claim.totalClaimAmount - initialDiscount
        );
        const initialTds = Math.round(
          (netAfterDiscount * (contract.tdsPercent || 0)) / 100
        );
        setTds(initialTds);
      }
    }
  }, [billBreakdown, contract, claim.totalClaimAmount]);

  const updateLine = (
    idx: number,
    field: keyof SettlementLineState,
    value: unknown
  ) => {
    setDeptLines((prev) => {
      const next = [...prev];
      const line = { ...next[idx], [field]: value };

      const approved = line.approvedAmount;
      line.deduction = Math.max(0, line.claimedAmount - approved);

      // 1. Recalculate Company Discount
      const companyPct = line.companyDiscountPercent;
      line.companyDiscountAmount =
        Math.round(((approved * companyPct) / 100) * 100) / 100;
      line.netAmount =
        Math.round((approved - line.companyDiscountAmount) * 100) / 100;

      // 2. Recalculate Vendor Discount
      const vendorPct = line.vendorDiscountPercent;
      let vendorAmt = (approved * vendorPct) / 100;
      const contractPolicy = contract?.departmentPolicies?.find(
        (p) => p.departmentCategory === line.departmentCategory
      );
      if (
        contractPolicy?.maxDiscountAmount &&
        vendorAmt > contractPolicy.maxDiscountAmount
      ) {
        vendorAmt = contractPolicy.maxDiscountAmount;
      }
      line.vendorDiscountAmount = Math.round(vendorAmt * 100) / 100;

      // 3. Recalculate Vendor Payout
      const isVendorDept = VENDOR_DEPARTMENTS.includes(line.departmentCategory);
      line.vendorPayout = isVendorDept
        ? Math.max(
            0,
            Math.round((approved - line.vendorDiscountAmount) * 100) / 100
          )
        : 0;

      // 4. Recalculate Hospital Share
      line.hospitalShare = isVendorDept
        ? Math.round(
            (line.vendorDiscountAmount - line.companyDiscountAmount) * 100
          ) / 100
        : line.netAmount;

      // 5. Update discount source indicators
      if (field === "companyDiscountPercent") {
        line.companyDiscountSource = "MANUAL";
      }
      if (field === "vendorDiscountPercent") {
        line.vendorDiscountSource = "MANUAL";
      }

      // Sync backward compatibility fields:
      line.discountPercent = line.companyDiscountPercent;
      line.discountAmount = line.companyDiscountAmount;

      next[idx] = line;
      return next;
    });
  };

  // Computed totals
  const totals = useMemo(() => {
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

    const activeApproved = hasBillBreakdown
      ? totalApproved
      : claim.totalClaimAmount;
    const activeCompanyDiscount = hasBillBreakdown
      ? totalCompanyDiscount
      : hospitalDiscount;
    const activeNet = Math.max(0, activeApproved - activeCompanyDiscount);

    // TDS on total net (after deductions and after company discount)
    const tdsPercent = contract?.tdsPercent ?? 0;
    const tdsAmount = Math.round((activeNet * tdsPercent) / 100);

    const extraRefund = Math.max(0, refundAmount - (claim.depositAmount || 0));
    const netPayable = Math.max(
      0,
      activeNet -
        (tds !== undefined && tds !== 0 ? tds : tdsAmount) -
        extraRefund
    );

    // Hospital Share Net is what the hospital actually keeps (taking into account TDS and refunds)
    const hospitalNetShare =
      Math.round((netPayable - totalVendorPayout) * 100) / 100;

    return {
      totalClaimed,
      totalApproved,
      totalDeductions,
      totalCompanyDiscount,
      totalVendorPayout,
      totalHospitalShare,
      tdsPercent,
      tdsAmount,
      netPayable,
      hospitalNetShare,
    };
  }, [
    deptLines,
    tds,
    hospitalDiscount,
    contract,
    hasBillBreakdown,
    claim.totalClaimAmount,
    refundAmount,
    claim.depositAmount,
  ]);

  // Auto-set TDS from computed
  useEffect(() => {
    if (contract && !isTdsUserEdited.current && totals.tdsAmount > 0) {
      setTds(totals.tdsAmount);
    }
  }, [totals.tdsAmount, contract]);

  const create = useMutation({
    mutationFn: () =>
      settlementApi.create({
        claimId: claim.id,
        approvedAmount: hasBillBreakdown
          ? totals.totalApproved
          : claim.totalClaimAmount,
        deductions: hasBillBreakdown ? totals.totalDeductions : 0,
        tds,
        hospitalDiscount: hasBillBreakdown
          ? totals.totalCompanyDiscount
          : hospitalDiscount,
        settlementMethod: method,
        settledBy: user?._id ?? "",
        remarks: "Recorded from Smart Finance Console",
        refundAmount,
        departmentBreakdown: deptLines,
        payerContractId: contract?._id,
        // New fields
        totalCompanyDiscount: hasBillBreakdown
          ? totals.totalCompanyDiscount
          : hospitalDiscount,
        totalVendorPayout: hasBillBreakdown ? totals.totalVendorPayout : 0,
        hospitalNetShare: hasBillBreakdown
          ? totals.hospitalNetShare
          : claim.totalClaimAmount - hospitalDiscount - tds,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settlement", claim.id] });
      qc.invalidateQueries({ queryKey: ["claim", claim.id] });
      qc.invalidateQueries({ queryKey: ["timeline", claim.id] });
      qc.invalidateQueries({ queryKey: ["deposit", claim.id] });
    },
  });

  const data = settlement.data;

  const allocations = useQuery({
    queryKey: ["allocations", data?._id],
    enabled: Boolean(data?._id),
    queryFn: () => allocationApi.list(data?._id ?? ""),
  });

  const deposit = useQuery({
    queryKey: ["deposit", claim.id],
    queryFn: () => depositApi.getByClaim(claim.id),
    retry: false,
  });

  const getCatLabel = (cat: string) =>
    DEPARTMENT_CATEGORIES.find((c) => c.value === cat)?.label ?? labelize(cat);

  // ────── POST-SETTLEMENT VIEW ──────
  if (data) {
    const bd = data.departmentBreakdown ?? [];

    const isPharmacist = user?.role === "PHARMACIST";
    if (isPharmacist) {
      const pharmacyLine = bd.find(
        (item) => item.departmentCategory === "PHARMACY"
      );
      const pharmacyClaimed = pharmacyLine?.claimedAmount ?? 0;
      const pharmacyApproved = pharmacyLine?.approvedAmount ?? 0;
      const pharmacyDeduction = pharmacyLine?.deduction ?? 0;
      const pharmacyDiscount = pharmacyLine?.vendorDiscountAmount ?? 0;
      const pharmacyPayout = pharmacyLine?.vendorPayout ?? 0;

      return (
        <div className="settlement-grid" style={{ gap: 20 }}>
          {/* Left Column: Summary */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <h3>Pharmacy Payout Summary</h3>
              <dl className="detail-list">
                <dt>Pharmacy Claimed</dt>
                <dd>{formatCurrency(pharmacyClaimed)}</dd>
                <dt>Pharmacy Approved</dt>
                <dd>{formatCurrency(pharmacyApproved)}</dd>
                <dt>Pharmacy Deduction</dt>
                <dd>{formatCurrency(pharmacyDeduction)}</dd>
                <dt>Pharmacy Vendor Discount</dt>
                <dd>{formatCurrency(pharmacyDiscount)}</dd>
                <dt>Net Pharmacy Payout</dt>
                <dd
                  style={{
                    padding: "4px 8px",
                    background:
                      "color-mix(in srgb, var(--emerald) 10%, transparent)",
                    borderRadius: 4,
                  }}
                >
                  <strong style={{ color: "var(--emerald)" }}>
                    {formatCurrency(pharmacyPayout)}
                  </strong>
                </dd>
                <dt>Settlement Method</dt>
                <dd>{labelize(data.settlementMethod)}</dd>
                <dt>Settlement Date</dt>
                <dd>{formatDateTime(data.settlementDate)}</dd>
              </dl>
            </div>
          </div>

          {/* Department breakdown */}
          {pharmacyLine && (
            <div>
              <h3>Department-wise settlement breakdown</h3>
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    fontSize: 12,
                    borderCollapse: "collapse",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom:
                          "1px solid color-mix(in srgb, var(--text-tertiary) 20%, transparent)",
                      }}
                    >
                      <th style={{ textAlign: "left", padding: "8px 6px" }}>
                        Department
                      </th>
                      <th style={{ textAlign: "right", padding: "8px 6px" }}>
                        Claimed
                      </th>
                      <th style={{ textAlign: "right", padding: "8px 6px" }}>
                        Approved
                      </th>
                      <th style={{ textAlign: "right", padding: "8px 6px" }}>
                        Deducted
                      </th>
                      <th style={{ textAlign: "right", padding: "8px 6px" }}>
                        Vendor Discount
                      </th>
                      <th style={{ textAlign: "right", padding: "8px 6px" }}>
                        Pharmacy Payout
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      style={{
                        borderBottom:
                          "1px solid color-mix(in srgb, var(--text-tertiary) 10%, transparent)",
                      }}
                    >
                      <td style={{ padding: "8px 6px" }}>
                        <strong>
                          {getCatLabel(pharmacyLine.departmentCategory)}
                        </strong>
                      </td>
                      <td style={{ textAlign: "right", padding: "8px 6px" }}>
                        {formatCurrency(pharmacyClaimed)}
                      </td>
                      <td style={{ textAlign: "right", padding: "8px 6px" }}>
                        {formatCurrency(pharmacyApproved)}
                      </td>
                      <td style={{ textAlign: "right", padding: "8px 6px" }}>
                        {formatCurrency(pharmacyDeduction)}
                      </td>
                      <td style={{ textAlign: "right", padding: "8px 6px" }}>
                        {formatCurrency(pharmacyDiscount)}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "8px 6px",
                          fontWeight: 700,
                          color: "var(--emerald)",
                        }}
                      >
                        {formatCurrency(pharmacyPayout)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="settlement-grid" style={{ gap: 20 }}>
        {/* Left Column: Summary & Deposits */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <h3>Settlement summary</h3>
            <dl className="detail-list">
              <dt>Approved</dt>
              <dd>{formatCurrency(data.approvedAmount)}</dd>
              <dt>Total deductions</dt>
              <dd>{formatCurrency(data.deductions)}</dd>
              <dt>Company Discount (Payer)</dt>
              <dd>
                {formatCurrency(
                  data.totalCompanyDiscount ?? data.hospitalDiscount
                )}
              </dd>
              <dt>TDS</dt>
              <dd>{formatCurrency(data.tds)}</dd>
              <dt>Net Payable from Company (Before TDS)</dt>
              <dd>
                <strong>
                  {formatCurrency(data.netPayable + (data.tds ?? 0))}
                </strong>
              </dd>
              <dt>Net Payable from Company (After TDS)</dt>
              <dd>
                <strong>{formatCurrency(data.netPayable)}</strong>
              </dd>
              <dt>Total Vendor Payout</dt>
              <dd>{formatCurrency(data.totalVendorPayout ?? 0)}</dd>
              <dt>Net Hospital Share (Before TDS)</dt>
              <dd>
                <strong style={{ color: "var(--emerald)" }}>
                  {formatCurrency(
                    (data.hospitalNetShare ??
                      data.netPayable - (data.totalVendorPayout ?? 0)) +
                      (data.tds ?? 0)
                  )}
                </strong>
              </dd>
              <dt>Net Hospital Share (After TDS)</dt>
              <dd
                style={{
                  padding: "4px 8px",
                  background:
                    "color-mix(in srgb, var(--emerald) 10%, transparent)",
                  borderRadius: 4,
                }}
              >
                <strong style={{ color: "var(--emerald)" }}>
                  {formatCurrency(
                    data.hospitalNetShare ??
                      data.netPayable - (data.totalVendorPayout ?? 0)
                  )}
                </strong>
              </dd>
              <dt>Method</dt>
              <dd>{labelize(data.settlementMethod)}</dd>
              <dt>Date</dt>
              <dd>{formatDateTime(data.settlementDate)}</dd>
            </dl>
          </div>

          <div>
            <h3>Deposits / refunds</h3>
            {deposit.data ? (
              <dl className="detail-list">
                <dt>Collected</dt>
                <dd>{formatCurrency(deposit.data.collectedAmount)}</dd>
                <dt>Refund</dt>
                <dd>{formatCurrency(deposit.data.refundAmount)}</dd>
                <dt>Status</dt>
                <dd>{labelize(deposit.data.refundStatus)}</dd>
              </dl>
            ) : (
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                No deposit record.
              </span>
            )}
          </div>
        </div>

        {/* Department breakdown */}
        {bd.length > 0 && (
          <div>
            <h3>Department-wise settlement breakdown</h3>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  fontSize: 12,
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom:
                        "1px solid color-mix(in srgb, var(--text-tertiary) 20%, transparent)",
                    }}
                  >
                    <th style={{ textAlign: "left", padding: "8px 6px" }}>
                      Department
                    </th>
                    <th style={{ textAlign: "right", padding: "8px 6px" }}>
                      Claimed
                    </th>
                    <th style={{ textAlign: "right", padding: "8px 6px" }}>
                      Approved
                    </th>
                    <th style={{ textAlign: "right", padding: "8px 6px" }}>
                      Deducted
                    </th>
                    <th style={{ textAlign: "right", padding: "8px 6px" }}>
                      Company Discount
                    </th>
                    <th style={{ textAlign: "right", padding: "8px 6px" }}>
                      Vendor Discount
                    </th>
                    <th style={{ textAlign: "right", padding: "8px 6px" }}>
                      Company Net
                    </th>
                    <th style={{ textAlign: "right", padding: "8px 6px" }}>
                      Vendor Payout
                    </th>
                    <th style={{ textAlign: "right", padding: "8px 6px" }}>
                      Hospital Share
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bd.map((line) => {
                    const isVendor = VENDOR_DEPARTMENTS.includes(
                      line.departmentCategory
                    );
                    const compPct =
                      line.companyDiscountPercent ?? line.discountPercent ?? 0;
                    const compAmt =
                      line.companyDiscountAmount ?? line.discountAmount ?? 0;
                    const vendPct =
                      line.vendorDiscountPercent ?? line.discountPercent ?? 0;
                    const vendAmt =
                      line.vendorDiscountAmount ?? line.discountAmount ?? 0;
                    const netAmt = line.approvedAmount - compAmt;
                    const vendPayout =
                      line.vendorPayout ??
                      (isVendor
                        ? Math.max(0, line.approvedAmount - vendAmt)
                        : 0);
                    const hospShare =
                      line.hospitalShare ??
                      (isVendor ? vendAmt - compAmt : netAmt);

                    return (
                      <tr
                        key={line.departmentCategory}
                        style={{
                          borderBottom:
                            "1px solid color-mix(in srgb, var(--text-tertiary) 10%, transparent)",
                        }}
                      >
                        <td style={{ padding: "8px 6px", fontWeight: 600 }}>
                          {getCatLabel(line.departmentCategory)}
                        </td>
                        <td style={{ textAlign: "right", padding: "8px 6px" }}>
                          {formatCurrency(line.claimedAmount)}
                        </td>
                        <td style={{ textAlign: "right", padding: "8px 6px" }}>
                          {formatCurrency(line.approvedAmount)}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            padding: "8px 6px",
                            color:
                              line.deduction > 0 ? "var(--red)" : undefined,
                          }}
                        >
                          {line.deduction > 0
                            ? `−${formatCurrency(line.deduction)}`
                            : "—"}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            padding: "8px 6px",
                            color: compAmt > 0 ? "var(--amber)" : undefined,
                          }}
                        >
                          {compAmt > 0
                            ? `−${formatCurrency(compAmt)} (${compPct}%)`
                            : "—"}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            padding: "8px 6px",
                            color: vendAmt > 0 ? "var(--amber)" : undefined,
                          }}
                        >
                          {vendAmt > 0
                            ? `−${formatCurrency(vendAmt)} (${vendPct}%)`
                            : "—"}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            padding: "8px 6px",
                            fontWeight: 600,
                          }}
                        >
                          {formatCurrency(netAmt)}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            padding: "8px 6px",
                            color: isVendor
                              ? "var(--blue)"
                              : "var(--text-secondary)",
                          }}
                        >
                          {isVendor ? formatCurrency(vendPayout) : "—"}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            padding: "8px 6px",
                            fontWeight: 700,
                            color: "var(--emerald)",
                          }}
                        >
                          {formatCurrency(hospShare)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Allocations & Deposits */}
        <div>
          <h3>Department allocations</h3>
          {allocations.data?.map((a) => (
            <div className="alert-row" key={a._id}>
              <strong>{formatCurrency(a.amount)}</strong>
              <span>
                {labelize(
                  typeof a.departmentId === "string"
                    ? a.departmentId
                    : a.departmentId.name
                )}{" "}
                · {a.remarks}
              </span>
            </div>
          ))}
          <small>
            Allocation totals are validated against settlement amount by the
            system; the UI prevents over-allocation in allocation workflows.
          </small>
        </div>
      </div>
    );
  }

  // ────── CREATE SETTLEMENT FORM ──────
  const isPharmacist = user?.role === "PHARMACIST";
  if (isPharmacist) {
    return (
      <div
        className="card premium-panel"
        style={{ padding: "24px", textAlign: "center" }}
      >
        <h3 style={{ color: "var(--accent-primary)", marginBottom: "12px" }}>
          Awaiting Final Settlement
        </h3>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "14px",
            marginBottom: "16px",
          }}
        >
          🔒 Settlement recording, TDS, and final allocations are restricted to
          Accountant and Admin roles. The settlement for this claim has not yet
          been registered.
        </p>
        <div
          style={{
            display: "inline-block",
            padding: "8px 16px",
            background:
              "color-mix(in srgb, var(--accent-primary) 10%, transparent)",
            borderRadius: "var(--r-md)",
            fontSize: "13px",
            color: "var(--text-secondary)",
          }}
        >
          Please coordinate with the finance department to finalize the
          settlement.
        </div>
      </div>
    );
  }

  return (
    <form
      className="quick-form"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate();
      }}
    >
      <h3>Smart Finance Console -Create Settlement</h3>

      {contract && (
        <div
          style={{
            padding: "8px 14px",
            background: "color-mix(in srgb, var(--green) 8%, transparent)",
            border:
              "1px solid color-mix(in srgb, var(--green) 25%, transparent)",
            borderRadius: "var(--r-md)",
            fontSize: 12,
            color: "var(--text-secondary)",
            marginBottom: 12,
          }}
        >
          <strong>Payer contract active</strong> · TDS: {contract.tdsPercent}%
          {" · "}
          Company default discount: {contract.defaultHospitalDiscountPercent}%
          {(contract.departmentPolicies ?? []).filter(
            (p) => p.isApplicable !== false
          ).length > 0 && (
            <>
              {" · "}
              <span style={{ color: "var(--green)" }}>
                {(contract.departmentPolicies ?? [])
                  .filter((p) => p.isApplicable !== false)
                  .map(
                    (p) =>
                      `${getCatLabel(p.departmentCategory)}: ${p.discountPercent}%`
                  )
                  .join(", ")}
              </span>
              {" (hospital policy)"}
            </>
          )}
        </div>
      )}

      {!hasBillBreakdown && (
        <div
          style={{
            padding: "10px 14px",
            background: "color-mix(in srgb, var(--amber) 8%, transparent)",
            border:
              "1px solid color-mix(in srgb, var(--amber) 25%, transparent)",
            borderRadius: "var(--r-md)",
            fontSize: 12,
            color: "var(--text-secondary)",
            marginBottom: 12,
          }}
        >
          <strong>⚠ No bill breakdown available.</strong> Enter department-wise
          bill breakdown in the section above for full department-wise
          settlement tracking. You can still create a flat settlement below.
        </div>
      )}

      {/* Department-wise lines */}
      {hasBillBreakdown && deptLines.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p className="eyebrow" style={{ marginBottom: 8, fontSize: 11 }}>
            Department-wise Settlement
          </p>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                fontSize: 12,
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom:
                      "1px solid color-mix(in srgb, var(--text-tertiary) 20%, transparent)",
                  }}
                >
                  <th style={{ textAlign: "left", padding: "6px" }}>Dept</th>
                  <th style={{ textAlign: "right", padding: "6px" }}>
                    Claimed
                  </th>
                  <th style={{ textAlign: "right", padding: "6px" }}>
                    Approved
                  </th>
                  <th style={{ textAlign: "right", padding: "6px" }}>
                    Deducted
                  </th>
                  <th style={{ textAlign: "right", padding: "6px" }}>
                    Company Disc %
                  </th>
                  <th style={{ textAlign: "right", padding: "6px" }}>
                    Vendor Disc %
                  </th>
                  <th style={{ textAlign: "right", padding: "6px" }}>
                    Company Net
                  </th>
                  <th style={{ textAlign: "right", padding: "6px" }}>
                    Vendor Payout
                  </th>
                  <th style={{ textAlign: "right", padding: "6px" }}>
                    Hospital Share
                  </th>
                </tr>
              </thead>
              <tbody>
                {deptLines.map((line, idx) => {
                  const isVendor = VENDOR_DEPARTMENTS.includes(
                    line.departmentCategory
                  );
                  return (
                    <tr
                      key={line.departmentCategory}
                      style={{
                        borderBottom:
                          "1px solid color-mix(in srgb, var(--text-tertiary) 8%, transparent)",
                      }}
                    >
                      <td style={{ padding: "6px", fontWeight: 600 }}>
                        {getCatLabel(line.departmentCategory)}
                      </td>
                      <td style={{ textAlign: "right", padding: "6px" }}>
                        {formatCurrency(line.claimedAmount)}
                      </td>
                      <td style={{ textAlign: "right", padding: "6px" }}>
                        <input
                          className="input"
                          type="number"
                          min={0}
                          value={line.approvedAmount}
                          onChange={(e) =>
                            updateLine(
                              idx,
                              "approvedAmount",
                              Number(e.target.value)
                            )
                          }
                          style={{
                            width: 80,
                            fontSize: 12,
                            padding: "3px 6px",
                            textAlign: "right",
                          }}
                        />
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "6px",
                          color: line.deduction > 0 ? "var(--red)" : undefined,
                          fontSize: 11,
                        }}
                      >
                        {line.deduction > 0
                          ? `−${formatCurrency(line.deduction)}`
                          : "—"}
                      </td>
                      <td style={{ textAlign: "right", padding: "6px" }}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-end",
                            gap: 2,
                          }}
                        >
                          <input
                            className="input"
                            type="number"
                            min={0}
                            max={100}
                            step="0.5"
                            value={line.companyDiscountPercent}
                            onChange={(e) =>
                              updateLine(
                                idx,
                                "companyDiscountPercent",
                                Number(e.target.value)
                              )
                            }
                            style={{
                              width: 60,
                              fontSize: 12,
                              padding: "3px 6px",
                              textAlign: "right",
                            }}
                          />
                          <span
                            style={{
                              display: "inline-block",
                              fontSize: 8,
                              fontWeight: 700,
                              letterSpacing: "0.3px",
                              padding: "1px 4px",
                              borderRadius: 3,
                              background:
                                line.companyDiscountSource === "MANUAL"
                                  ? "color-mix(in srgb, var(--amber) 15%, transparent)"
                                  : "color-mix(in srgb, var(--blue, #3b82f6) 15%, transparent)",
                              color:
                                line.companyDiscountSource === "MANUAL"
                                  ? "var(--amber)"
                                  : "var(--blue, #3b82f6)",
                            }}
                          >
                            {line.companyDiscountSource === "MANUAL"
                              ? "✏️ MANUAL"
                              : "🏢 DEFAULT"}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: "right", padding: "6px" }}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-end",
                            gap: 2,
                          }}
                        >
                          <input
                            className="input"
                            type="number"
                            min={0}
                            max={100}
                            step="0.5"
                            value={line.vendorDiscountPercent}
                            onChange={(e) =>
                              updateLine(
                                idx,
                                "vendorDiscountPercent",
                                Number(e.target.value)
                              )
                            }
                            style={{
                              width: 60,
                              fontSize: 12,
                              padding: "3px 6px",
                              textAlign: "right",
                            }}
                          />
                          <span
                            style={{
                              display: "inline-block",
                              fontSize: 8,
                              fontWeight: 700,
                              letterSpacing: "0.3px",
                              padding: "1px 4px",
                              borderRadius: 3,
                              background:
                                line.vendorDiscountSource === "POLICY"
                                  ? "color-mix(in srgb, var(--green) 15%, transparent)"
                                  : line.vendorDiscountSource === "MANUAL"
                                    ? "color-mix(in srgb, var(--amber) 15%, transparent)"
                                    : "color-mix(in srgb, var(--blue, #3b82f6) 15%, transparent)",
                              color:
                                line.vendorDiscountSource === "POLICY"
                                  ? "var(--green)"
                                  : line.vendorDiscountSource === "MANUAL"
                                    ? "var(--amber)"
                                    : "var(--blue, #3b82f6)",
                            }}
                          >
                            {line.vendorDiscountSource === "POLICY"
                              ? "🏥 POLICY"
                              : line.vendorDiscountSource === "MANUAL"
                                ? "✏️ MANUAL"
                                : "🏢 DEFAULT"}
                          </span>
                        </div>
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "6px",
                          fontWeight: 600,
                        }}
                      >
                        {formatCurrency(line.netAmount)}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "6px",
                          color: isVendor
                            ? "var(--blue)"
                            : "var(--text-secondary)",
                        }}
                      >
                        {isVendor ? formatCurrency(line.vendorPayout) : "—"}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "6px",
                          fontWeight: 700,
                          color: "var(--emerald)",
                        }}
                      >
                        {formatCurrency(line.hospitalShare)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr
                  style={{
                    borderTop:
                      "2px solid color-mix(in srgb, var(--text-tertiary) 25%, transparent)",
                    fontWeight: 700,
                  }}
                >
                  <td style={{ padding: "8px 6px" }}>TOTAL</td>
                  <td style={{ textAlign: "right", padding: "8px 6px" }}>
                    {formatCurrency(totals.totalClaimed)}
                  </td>
                  <td style={{ textAlign: "right", padding: "8px 6px" }}>
                    {formatCurrency(totals.totalApproved)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "8px 6px",
                      color: "var(--red)",
                    }}
                  >
                    −{formatCurrency(totals.totalDeductions)}
                  </td>
                  <td style={{ padding: "8px 6px" }}></td>
                  <td style={{ padding: "8px 6px" }}></td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "8px 6px",
                      color: "var(--amber)",
                    }}
                  >
                    −{formatCurrency(totals.totalCompanyDiscount)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "8px 6px",
                      color: "var(--blue)",
                    }}
                  >
                    {formatCurrency(totals.totalVendorPayout)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "8px 6px",
                      color: "var(--emerald)",
                    }}
                  >
                    {formatCurrency(totals.totalHospitalShare)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Flat overrides + final summary */}
      <div className="form-grid">
        {!hasBillBreakdown && (
          <label className="field">
            <span>Approved amount</span>
            <input
              className="input"
              type="number"
              value={totals.totalApproved || claim.totalClaimAmount}
              readOnly
            />
          </label>
        )}

        <label className="field">
          <span>TDS (₹)</span>
          <input
            className="input"
            type="number"
            value={tds}
            onChange={(e) => {
              setTds(Number(e.target.value));
              isTdsUserEdited.current = true;
            }}
            min={0}
          />
          {contract && (
            <small style={{ color: "var(--text-tertiary)", fontSize: 11 }}>
              Contract TDS: {contract.tdsPercent}% = ₹{totals.tdsAmount}
            </small>
          )}
        </label>

        <label className="field">
          <span>Company Discount (₹)</span>
          <input
            className="input"
            type="number"
            value={
              hasBillBreakdown ? totals.totalCompanyDiscount : hospitalDiscount
            }
            onChange={(e) => setHospitalDiscount(Number(e.target.value))}
            readOnly={hasBillBreakdown}
            min={0}
          />
        </label>

        <label className="field">
          <span>Method</span>
          <select
            className="input"
            value={method}
            onChange={(e) => setMethod(e.target.value as SettlementMethod)}
          >
            <option>PORTAL</option>
            <option>EMAIL</option>
            <option>COURIER</option>
          </select>
        </label>

        <label className="field">
          <span>Refund to patient (₹)</span>
          <input
            className="input"
            type="number"
            value={refundAmount}
            onChange={(e) => setRefundAmount(Number(e.target.value))}
            min={0}
          />
          <small style={{ color: "var(--text-secondary)", fontSize: 11 }}>
            Deposit collected: {formatCurrency(claim.depositAmount || 0)}
          </small>
        </label>

        <div
          style={{
            display: "flex",
            gap: 12,
            width: "100%",
            gridColumn: "1 / -1",
          }}
        >
          <div className="readonly-total" style={{ flex: 1 }}>
            <span>Net Payable from Company</span>
            <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
              <div>
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    display: "block",
                  }}
                >
                  Before TDS
                </span>
                <strong style={{ fontSize: 16 }}>
                  {formatCurrency(totals.netPayable + tds)}
                </strong>
              </div>
              <div
                style={{
                  borderLeft: "1px solid var(--border)",
                  paddingLeft: 16,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    display: "block",
                  }}
                >
                  After TDS
                </span>
                <strong style={{ fontSize: 16 }}>
                  {formatCurrency(totals.netPayable)}
                </strong>
              </div>
            </div>
          </div>
          <div
            className="readonly-total"
            style={{
              flex: 1,
              borderLeft: "4px solid var(--emerald)",
              background: "color-mix(in srgb, var(--emerald) 5%, transparent)",
            }}
          >
            <span style={{ color: "var(--emerald)" }}>
              Net Hospital Share (Without Vendor)
            </span>
            <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
              <div>
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    display: "block",
                  }}
                >
                  Before TDS
                </span>
                <strong style={{ fontSize: 16, color: "var(--emerald)" }}>
                  {formatCurrency(totals.hospitalNetShare + tds)}
                </strong>
              </div>
              <div
                style={{
                  borderLeft: "1px solid var(--emerald)",
                  paddingLeft: 16,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    display: "block",
                  }}
                >
                  After TDS
                </span>
                <strong style={{ fontSize: 16, color: "var(--emerald)" }}>
                  {formatCurrency(totals.hospitalNetShare)}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {create.isError && <ErrorPanel error={create.error} />}
      <Button disabled={!user?._id || create.isPending}>
        Finalize Settlement
      </Button>
    </form>
  );
}
