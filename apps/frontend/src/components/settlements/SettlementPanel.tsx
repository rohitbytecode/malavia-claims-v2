import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
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
} from "../../types/domain";
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

  // Initialize department lines from bill breakdown
  const [deptLines, setDeptLines] = useState<SettlementDepartmentBreakdown[]>(
    []
  );
  const [method, setMethod] = useState<SettlementMethod>("PORTAL");
  const [hospitalDiscount, setHospitalDiscount] = useState(0);
  const [tds, setTds] = useState(0);
  const [refundAmount, setRefundAmount] = useState(claim.depositAmount || 0);

  // Build initial department lines when data is available
  useEffect(() => {
    if (billBreakdown.length > 0) {
      const policyMap = new Map(
        (contract?.departmentPolicies ?? [])
          .filter((p) => p.isApplicable !== false)
          .map((p) => [
            p.departmentCategory,
            p,
          ])
      );

      const lines: SettlementDepartmentBreakdown[] = billBreakdown
        .filter((b) => b.amount > 0)
        .map((b) => {
          const policy = policyMap.get(b.departmentCategory);
          const claimed = b.amount;
          const approved = claimed; // default: approved = claimed, user can change

          // Apply specific department policy discount, or fallback to default company discount
          const discountPct = policy?.discountPercent || contract?.defaultHospitalDiscountPercent || 0;
          let discountAmt = (approved * discountPct) / 100;

          if (policy?.maxDiscountAmount && discountAmt > policy.maxDiscountAmount) {
            discountAmt = policy.maxDiscountAmount;
          }
          const net = Math.max(0, approved - discountAmt);
          return {
            departmentCategory: b.departmentCategory,
            claimedAmount: claimed,
            approvedAmount: approved,
            deduction: Math.max(0, claimed - approved),
            discountPercent: discountPct,
            discountAmount: Math.round(discountAmt * 100) / 100,
            netAmount: Math.round(net * 100) / 100,
            remarks: "",
          };
        });
      setDeptLines(lines);

      if (contract) {
        const initialTotalNet = lines.reduce((sum, line) => sum + line.netAmount, 0);
        const initialTds = Math.round((initialTotalNet * (contract.tdsPercent || 0)) / 100);
        setTds(initialTds);

        setHospitalDiscount(0);
      }
    }
  }, [billBreakdown.length, contract?._id]);

  const updateLine = (
    idx: number,
    field: keyof SettlementDepartmentBreakdown,
    value: unknown
  ) => {
    setDeptLines((prev) => {
      const next = [...prev];
      const line = { ...next[idx], [field]: value };

      // Recalculate derived fields
      if (field === "approvedAmount" || field === "discountPercent") {
        const approved =
          field === "approvedAmount"
            ? (value as number)
            : line.approvedAmount;
        const discPct =
          field === "discountPercent"
            ? (value as number)
            : line.discountPercent;
        line.deduction = Math.max(0, line.claimedAmount - approved);
        let discAmt = (approved * discPct) / 100;

        // Respect max discount from contract
        const contractPolicy = contract?.departmentPolicies?.find(
          (p) => p.departmentCategory === line.departmentCategory
        );
        if (contractPolicy?.maxDiscountAmount && discAmt > contractPolicy.maxDiscountAmount) {
          discAmt = contractPolicy.maxDiscountAmount;
        }

        line.discountAmount = Math.round(discAmt * 100) / 100;
        line.netAmount = Math.max(
          0,
          Math.round((approved - line.discountAmount) * 100) / 100
        );
      }

      next[idx] = line;
      return next;
    });
  };

  // Computed totals
  const totals = useMemo(() => {
    const totalClaimed = deptLines.reduce((s, l) => s + l.claimedAmount, 0);
    const totalApproved = deptLines.reduce((s, l) => s + l.approvedAmount, 0);
    const totalDeductions = deptLines.reduce((s, l) => s + l.deduction, 0);
    const totalDiscounts = deptLines.reduce((s, l) => s + l.discountAmount, 0);
    const totalNet = deptLines.reduce((s, l) => s + l.netAmount, 0);

    // TDS on total approved
    const tdsPercent = contract?.tdsPercent ?? 0;
    const tdsAmount = Math.round((totalApproved * tdsPercent) / 100 * 100) / 100;

    const netPayable = Math.max(
      0,
      totalNet - (tds || tdsAmount) - hospitalDiscount
    );

    return {
      totalClaimed,
      totalApproved,
      totalDeductions,
      totalDiscounts,
      totalNet,
      tdsPercent,
      tdsAmount,
      netPayable,
    };
  }, [deptLines, tds, hospitalDiscount, contract]);

  // Auto-set TDS from computed
  useEffect(() => {
    if (contract && tds === 0 && totals.tdsAmount > 0) {
      setTds(totals.tdsAmount);
    }
  }, [totals.tdsAmount]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = useMutation({
    mutationFn: () =>
      settlementApi.create({
        claimId: claim.id,
        approvedAmount: totals.totalApproved,
        deductions: totals.totalDeductions,
        tds,
        hospitalDiscount,
        settlementMethod: method,
        settledBy: user?._id ?? "",
        remarks: "Recorded from Smart Finance Console",
        refundAmount,
        departmentBreakdown: deptLines,
        payerContractId: contract?._id,
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
              <dt>Total discounts</dt>
              <dd>
                {formatCurrency(
                  bd.reduce((s, l) => s + (l.discountAmount || 0), 0)
                )}
              </dd>
              <dt>TDS</dt>
              <dd>{formatCurrency(data.tds)}</dd>
              <dt>Hospital discount</dt>
              <dd>{formatCurrency(data.hospitalDiscount)}</dd>
              <dt>Net payable</dt>
              <dd>
                <strong>{formatCurrency(data.netPayable)}</strong>
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
                      Discount
                    </th>
                    <th style={{ textAlign: "right", padding: "8px 6px" }}>
                      Net
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bd.map((line) => (
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
                      <td
                        style={{ textAlign: "right", padding: "8px 6px" }}
                      >
                        {formatCurrency(line.claimedAmount)}
                      </td>
                      <td
                        style={{ textAlign: "right", padding: "8px 6px" }}
                      >
                        {formatCurrency(line.approvedAmount)}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "8px 6px",
                          color: line.deduction > 0 ? "var(--red)" : undefined,
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
                          color:
                            line.discountAmount > 0 ? "var(--amber)" : undefined,
                        }}
                      >
                        {line.discountAmount > 0
                          ? `−${formatCurrency(line.discountAmount)} (${line.discountPercent}%)`
                          : "—"}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "8px 6px",
                          fontWeight: 700,
                        }}
                      >
                        {formatCurrency(line.netAmount)}
                      </td>
                    </tr>
                  ))}
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
            backend; the UI prevents over-allocation in allocation workflows.
          </small>
        </div>
      </div>
    );
  }

  // ────── CREATE SETTLEMENT FORM ──────
  const hasBillBreakdown = billBreakdown.length > 0;

  return (
    <form
      className="quick-form"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate();
      }}
    >
      <h3>Smart Finance Console — Create Settlement</h3>

      {contract && (
        <div
          style={{
            padding: "8px 14px",
            background: "color-mix(in srgb, var(--green) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)",
            borderRadius: "var(--r-md)",
            fontSize: 12,
            color: "var(--text-secondary)",
            marginBottom: 12,
          }}
        >
          <strong>Payer contract active</strong> · TDS:{" "}
          {contract.tdsPercent}% · Hospital discount:{" "}
          {contract.defaultHospitalDiscountPercent}% · Department discounts
          auto-applied from contract.
        </div>
      )}

      {!hasBillBreakdown && (
        <div
          style={{
            padding: "10px 14px",
            background: "color-mix(in srgb, var(--amber) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--amber) 25%, transparent)",
            borderRadius: "var(--r-md)",
            fontSize: 12,
            color: "var(--text-secondary)",
            marginBottom: 12,
          }}
        >
          <strong>⚠ No bill breakdown available.</strong> Enter department-wise
          bill breakdown in the section above for full department-wise settlement
          tracking. You can still create a flat settlement below.
        </div>
      )}

      {/* Department-wise lines */}
      {hasBillBreakdown && deptLines.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p
            className="eyebrow"
            style={{ marginBottom: 8, fontSize: 11 }}
          >
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
                    Disc %
                  </th>
                  <th style={{ textAlign: "right", padding: "6px" }}>
                    Disc ₹
                  </th>
                  <th style={{ textAlign: "right", padding: "6px" }}>Net</th>
                </tr>
              </thead>
              <tbody>
                {deptLines.map((line, idx) => (
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
                          width: 100,
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
                      <input
                        className="input"
                        type="number"
                        min={0}
                        max={100}
                        step="0.5"
                        value={line.discountPercent}
                        onChange={(e) =>
                          updateLine(
                            idx,
                            "discountPercent",
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
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        padding: "6px",
                        color:
                          line.discountAmount > 0 ? "var(--amber)" : undefined,
                        fontSize: 11,
                      }}
                    >
                      {line.discountAmount > 0
                        ? formatCurrency(line.discountAmount)
                        : "—"}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        padding: "6px",
                        fontWeight: 700,
                      }}
                    >
                      {formatCurrency(line.netAmount)}
                    </td>
                  </tr>
                ))}
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
                  <td
                    style={{
                      textAlign: "right",
                      padding: "8px 6px",
                      color: "var(--amber)",
                    }}
                  >
                    −{formatCurrency(totals.totalDiscounts)}
                  </td>
                  <td style={{ textAlign: "right", padding: "8px 6px" }}>
                    {formatCurrency(totals.totalNet)}
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
            onChange={(e) => setTds(Number(e.target.value))}
            min={0}
          />
          {contract && (
            <small style={{ color: "var(--text-tertiary)", fontSize: 11 }}>
              Contract TDS: {contract.tdsPercent}% = ₹
              {totals.tdsAmount.toFixed(2)}
            </small>
          )}
        </label>

        <label className="field">
          <span>Hospital discount (₹)</span>
          <input
            className="input"
            type="number"
            value={hospitalDiscount}
            onChange={(e) => setHospitalDiscount(Number(e.target.value))}
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

        <div className="readonly-total">
          <span>Net Payable (auto-calculated)</span>
          <strong style={{ fontSize: 18 }}>
            {formatCurrency(totals.netPayable)}
          </strong>
        </div>
      </div>

      {create.isError && <ErrorPanel error={create.error} />}
      <Button disabled={!user?._id || create.isPending}>
        Finalize Settlement
      </Button>
    </form>
  );
}
