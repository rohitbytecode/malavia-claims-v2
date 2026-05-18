import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { settlementApi, allocationApi, depositApi } from "../../api/services";
import { useAuthStore } from "../../store/auth.store";
import type { Claim, SettlementMethod } from "../../types/domain";
import { formatCurrency, formatDateTime, labelize } from "../../utils/format";
import { Button } from "../ui/Button";
import { ErrorPanel } from "../ui/ErrorPanel";
export function SettlementPanel({ claim }: { claim: Claim }) {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const settlement = useQuery({
    queryKey: ["settlement", claim.id],
    queryFn: () => settlementApi.getByClaim(claim.id),
    retry: false,
  });
  const [approvedAmount, setApprovedAmount] = useState(claim.totalClaimAmount);
  const [deductions, setDeductions] = useState(0);
  const [tds, setTds] = useState(0);
  const [hospitalDiscount, setHospitalDiscount] = useState(0);
  const [method, setMethod] = useState<SettlementMethod>("PORTAL");
  const create = useMutation({
    mutationFn: () =>
      settlementApi.create({
        claimId: claim.id,
        approvedAmount,
        deductions,
        tds,
        hospitalDiscount,
        settlementMethod: method,
        settledBy: user?._id ?? "",
        remarks: "Recorded from frontend settlement panel",
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["settlement", claim.id] }),
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
  if (data)
    return (
      <div className="settlement-grid">
        <div>
          <h3>Settlement</h3>
          <dl className="detail-list">
            <dt>Approved</dt>
            <dd>{formatCurrency(data.approvedAmount)}</dd>
            <dt>Deductions</dt>
            <dd>{formatCurrency(data.deductions)}</dd>
            <dt>TDS</dt>
            <dd>{formatCurrency(data.tds)}</dd>
            <dt>Net payable</dt>
            <dd>{formatCurrency(data.netPayable)}</dd>
            <dt>Method</dt>
            <dd>{labelize(data.settlementMethod)}</dd>
            <dt>Date</dt>
            <dd>{formatDateTime(data.settlementDate)}</dd>
          </dl>
        </div>
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
            <span>No deposit record.</span>
          )}
        </div>
      </div>
    );
  const net = Math.max(0, approvedAmount - deductions - tds - hospitalDiscount);
  return (
    <form
      className="quick-form"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate();
      }}
    >
      <h3>Create settlement</h3>
      <div className="form-grid">
        <label className="field">
          <span>Approved amount</span>
          <input
            className="input"
            type="number"
            value={approvedAmount}
            onChange={(e) => setApprovedAmount(Number(e.target.value))}
          />
        </label>
        <label className="field">
          <span>Deductions</span>
          <input
            className="input"
            type="number"
            value={deductions}
            onChange={(e) => setDeductions(Number(e.target.value))}
          />
        </label>
        <label className="field">
          <span>TDS</span>
          <input
            className="input"
            type="number"
            value={tds}
            onChange={(e) => setTds(Number(e.target.value))}
          />
        </label>
        <label className="field">
          <span>Hospital discount</span>
          <input
            className="input"
            type="number"
            value={hospitalDiscount}
            onChange={(e) => setHospitalDiscount(Number(e.target.value))}
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
        <div className="readonly-total">
          <span>Backend-controlled net payable preview</span>
          <strong>{formatCurrency(net)}</strong>
        </div>
      </div>
      {create.isError && <ErrorPanel error={create.error} />}
      <Button disabled={!user?._id || create.isPending}>
        Finalize settlement
      </Button>
    </form>
  );
}
