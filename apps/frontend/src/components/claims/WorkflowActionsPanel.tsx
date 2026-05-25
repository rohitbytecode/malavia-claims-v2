import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { claimsApi } from "../../api/services";
import {
  allowedTransitions,
  canRoleTransition,
} from "../../constants/workflow";
import { canCloseClaims, canSeeFinance } from "../../constants/operations";
import { useAuthStore } from "../../store/auth.store";
import type { Claim, ClaimStatus } from "../../types/domain";
import { formatCurrency, labelize } from "../../utils/format";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { ErrorPanel } from "../ui/ErrorPanel";
import { StatusBadge } from "../ui/StatusBadge";

const TRANSITION_RISK: Record<string, "low" | "medium" | "high" | "critical"> =
  {
    CLOSED: "critical",
    SETTLED: "high",
    FINAL_REJECTED: "high",
    PREAUTH_REJECTED: "medium",
    SETTLEMENT_PENDING: "medium",
  };

const RISK_COLORS: Record<string, string> = {
  critical: "var(--red)",
  high: "var(--amber)",
  medium: "var(--amber)",
  low: "var(--accent-primary)",
};

export function WorkflowActionsPanel({ claim }: { claim: Claim }) {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [target, setTarget] = useState<ClaimStatus | undefined>();
  const [remarks, setRemarks] = useState("");
  const [alNumber, setAlNumber] = useState("");
  const [updatedClaimAmount, setUpdatedClaimAmount] = useState<number>(
    claim.totalClaimAmount
  );
  const [updatedDepositAmount, setUpdatedDepositAmount] = useState<number>(
    claim.depositAmount || 0
  );

  const isReconsiderationExpired = useMemo(() => {
    if (
      claim.status !== "PREAUTH_REJECTED" &&
      claim.status !== "FINAL_REJECTED"
    ) {
      return false;
    }
    const updatedAtDate = new Date(claim.updatedAt);
    const diffMs = Date.now() - updatedAtDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays > 7;
  }, [claim.status, claim.updatedAt]);

  const historyQuery = useQuery({
    queryKey: ["history", claim.id],
    queryFn: () => claimsApi.history(claim.id),
  });

  const lastRejectionStatus = useMemo(() => {
    if (!historyQuery.data) return null;
    const sorted = [...historyQuery.data].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const found = sorted.find(
      (h) =>
        h.toStatus === "PREAUTH_REJECTED" || h.toStatus === "FINAL_REJECTED"
    );
    return found ? found.toStatus : null;
  }, [historyQuery.data]);

  const transitions = useMemo(() => {
    let allowed = allowedTransitions(claim.type, claim.status);
    if (claim.status === "RECONSIDERATION_PENDING") {
      if (lastRejectionStatus === "PREAUTH_REJECTED") {
        allowed = ["PREAUTH_APPROVED", "PREAUTH_REJECTED"];
      } else if (lastRejectionStatus === "FINAL_REJECTED") {
        allowed = ["FINAL_APPROVED", "FINAL_REJECTED"];
      } else {
        if (claim.claimNumber && claim.claimNumber !== claim.id) {
          allowed = ["FINAL_APPROVED", "FINAL_REJECTED"];
        } else {
          allowed = ["PREAUTH_APPROVED", "PREAUTH_REJECTED"];
        }
      }
    }
    return allowed.filter((s) =>
      user ? canRoleTransition(user.role, s) : false
    );
  }, [claim.status, claim.type, claim.claimNumber, user, lastRejectionStatus]);

  /* Pre-auth approval gate: require claim/AL number from the insurance company */
  const needsAlNumber =
    (claim.status === "PREAUTH_PENDING" ||
      claim.status === "RECONSIDERATION_PENDING") &&
    target === "PREAUTH_APPROVED";
  const alNumberValid = !needsAlNumber || alNumber.trim().length >= 2;

  /* Claim amount editing is allowed during draft -> preauth_pending, pre-auth approval & final approval */
  const canEditAmount =
    (claim.status === "DRAFT" && target === "PREAUTH_PENDING") ||
    ((claim.status === "PREAUTH_PENDING" ||
      claim.status === "RECONSIDERATION_PENDING") &&
      target === "PREAUTH_APPROVED") ||
    ((claim.status === "FINAL_APPROVAL_PENDING" ||
      claim.status === "RECONSIDERATION_PENDING") &&
      target === "FINAL_APPROVED");

  const mutation = useMutation({
    mutationFn: ({
      status,
      reason,
      claimNumber,
      totalClaimAmount,
      depositAmount,
    }: {
      status: ClaimStatus;
      reason: string;
      claimNumber?: string;
      totalClaimAmount?: number;
      depositAmount?: number;
    }) =>
      claimsApi.transition(claim.id, {
        toStatus: status,
        remarks: reason,
        performedBy: user?._id,
        ...(claimNumber ? { claimNumber } : {}),
        ...(totalClaimAmount !== undefined ? { totalClaimAmount } : {}),
        ...(depositAmount !== undefined ? { depositAmount } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["claim", claim.id] });
      qc.invalidateQueries({ queryKey: ["timeline", claim.id] });
      qc.invalidateQueries({ queryKey: ["history", claim.id] });
      qc.invalidateQueries({ queryKey: ["deposit", claim.id] });
      setTarget(undefined);
      setRemarks("");
      setAlNumber("");
      setUpdatedClaimAmount(claim.totalClaimAmount);
      setUpdatedDepositAmount(claim.depositAmount || 0);
    },
  });

  const isClosed = claim.status === "CLOSED";
  const closeBlocked = target === "CLOSED" && !canCloseClaims(user?.role);
  const financeBlocked = target === "SETTLED" && !canSeeFinance(user?.role);
  const isBlocked = closeBlocked || financeBlocked;
  const remarksValid = remarks.trim().length >= 8;
  const risk = target ? (TRANSITION_RISK[target] ?? "low") : "low";

  return (
    <aside className="action-panel">
      {/* Header */}
      <div className="action-panel__header">
        <p className="eyebrow">Workflow Action</p>
        <h2>{labelize(claim.status)}</h2>
        <StatusBadge value={claim.status} />
      </div>

      {/* Operator card */}
      <div className="action-panel__body">
        <div className="action-panel__operator">
          <div className="action-panel__operator-avatar">
            {user?.fullName?.charAt(0) ?? "?"}
          </div>
          <div className="action-panel__operator-info">
            <strong>{user?.fullName ?? "Unknown"}</strong>
            <span className="action-panel__operator-role">{user?.role}</span>
          </div>
        </div>

        {/* Locked state */}
        {isClosed && (
          <div className="action-panel__restriction action-panel__restriction--critical">
            <span>⊗</span>
            <div>
              <strong>Claim Closed</strong>
              <p>
                CLOSED is a terminal state. No further workflow transitions are
                permitted. SUPER_ADMIN reopen requires a separate audit
                procedure.
              </p>
            </div>
          </div>
        )}

        {/* Transition buttons */}
        {!isClosed && transitions.length > 0 && (
          <div className="action-panel__transitions">
            <p className="action-panel__section-label">Available Transitions</p>
            {transitions.map((status) => {
              const r = TRANSITION_RISK[status] ?? "low";
              const isExpiredReconsideration =
                status === "RECONSIDERATION_PENDING" &&
                isReconsiderationExpired;
              const isSettledTransitionDisabled =
                claim.status === "SETTLEMENT_PENDING" && status === "SETTLED";
              const isDisabled =
                isExpiredReconsideration || isSettledTransitionDisabled;
              const tooltipTitle = isExpiredReconsideration
                ? "Reconsideration period of 7 days has expired"
                : isSettledTransitionDisabled
                  ? "Please finalize the settlement in the Finance Execution Console instead."
                  : "";

              return (
                <button
                  key={status}
                  className={`action-panel__transition-btn action-panel__transition-btn--${r}`}
                  onClick={() => setTarget(status)}
                  disabled={isDisabled}
                  style={
                    {
                      "--risk-color": isDisabled
                        ? "var(--text-tertiary)"
                        : RISK_COLORS[r],
                      opacity: isDisabled ? 0.6 : 1,
                      cursor: isDisabled ? "not-allowed" : "pointer",
                    } as React.CSSProperties
                  }
                  title={tooltipTitle}
                  type="button"
                >
                  <span className="action-panel__transition-arrow">→</span>
                  <span>
                    {labelize(status)}
                    {isExpiredReconsideration
                      ? " (Expired)"
                      : isSettledTransitionDisabled
                        ? " (Use Finance Console)"
                        : ""}
                  </span>
                  {r === "critical" && (
                    <span className="action-panel__risk-badge">CRITICAL</span>
                  )}
                  {r === "high" && (
                    <span className="action-panel__risk-badge action-panel__risk-badge--high">
                      REVIEW
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {!isClosed && transitions.length === 0 && (
          <div className="action-panel__restriction">
            <span>◈</span>
            <p>
              No permitted transitions for your role at this workflow stage.
            </p>
          </div>
        )}

        {/* Guardrails */}
        <div className="action-panel__guardrails">
          <p className="action-panel__section-label">System Guardrails</p>
          <ul>
            <li>Invalid transitions are hidden — not blocked</li>
            <li>Every action requires a minimum 8-character audit reason</li>
            <li>Backend workflow validator is the final authority</li>
            <li>All actions are logged to the immutable audit trail</li>
          </ul>
        </div>
      </div>

      {/* Confirmation modal */}
      <Modal
        open={Boolean(target)}
        title="Confirm Workflow Transition"
        onClose={() => {
          setTarget(undefined);
          setRemarks("");
          setAlNumber("");
          setUpdatedClaimAmount(claim.totalClaimAmount);
        }}
      >
        <div className="modal-body">
          {target && (
            <>
              <div className="action-panel__confirm-info">
                <div className="action-panel__confirm-from">
                  <span>From</span>
                  <StatusBadge value={claim.status} />
                </div>
                <span className="action-panel__confirm-arrow">→</span>
                <div className="action-panel__confirm-to">
                  <span>To</span>
                  <StatusBadge value={target} />
                </div>
              </div>

              {/* Risk warning */}
              {(risk === "critical" || risk === "high") && (
                <div
                  className={`action-panel__risk-warning action-panel__risk-warning--${risk}`}
                  style={{
                    borderColor: RISK_COLORS[risk],
                    color: RISK_COLORS[risk],
                  }}
                >
                  <span>{risk === "critical" ? "⊗" : "⚠"}</span>
                  <div>
                    <strong>
                      {risk === "critical"
                        ? "Irreversible Action"
                        : "High-Impact Action"}
                    </strong>
                    <p>
                      {risk === "critical"
                        ? "This transition cannot be undone. CLOSED is a terminal state."
                        : "This transition has significant operational impact. Ensure all prerequisites are met."}
                    </p>
                  </div>
                </div>
              )}

              {/* Role restriction warnings */}
              {closeBlocked && (
                <div className="action-panel__restriction action-panel__restriction--critical">
                  <span>⊗</span>
                  <p>
                    Your role cannot close claims. This action requires ADMIN,
                    CLAIM_MANAGER, or SUPER_ADMIN.
                  </p>
                </div>
              )}
              {financeBlocked && (
                <div className="action-panel__restriction action-panel__restriction--high">
                  <span>⚠</span>
                  <p>
                    Settlement transitions are restricted to finance and admin
                    roles (ACCOUNTANT, ADMIN, SUPER_ADMIN).
                  </p>
                </div>
              )}

              {/* Insurance Claim / AL Number — mandatory for pre-auth approval */}
              {needsAlNumber && (
                <div className="action-panel__audit-section">
                  <label className="field">
                    <span>
                      Insurance Claim / AL Number{" "}
                      <span className="action-panel__required">*</span>
                    </span>
                    <input
                      className="input"
                      type="text"
                      value={alNumber}
                      onChange={(e) => setAlNumber(e.target.value)}
                      placeholder="Enter the Claim No. or AL No. given by the insurance company"
                      disabled={isBlocked}
                      autoFocus
                    />
                  </label>
                  {alNumber.length > 0 && !alNumberValid && (
                    <small className="field-error">
                      Insurance Claim / AL Number is required for pre-auth
                      approval.
                    </small>
                  )}
                  {!alNumber && (
                    <small
                      style={{
                        display: "block",
                        marginTop: 4,
                        fontSize: 11,
                        color: "var(--amber)",
                        fontWeight: 600,
                      }}
                    >
                      ⚠ This number is mandatory. The claim number will be
                      updated to the insurance company's reference number.
                    </small>
                  )}
                </div>
              )}

              {/* Claim amount edit — only for permitted transitions */}
              {canEditAmount && (
                <div className="action-panel__audit-section">
                  <label className="field">
                    <span>Claim Amount (₹)</span>
                    <input
                      className="input input-mono"
                      type="number"
                      value={updatedClaimAmount}
                      onChange={(e) =>
                        setUpdatedClaimAmount(Number(e.target.value))
                      }
                      min={0}
                      step="0.01"
                      disabled={isBlocked}
                    />
                  </label>
                  {updatedClaimAmount !== claim.totalClaimAmount ? (
                    <small
                      style={{
                        display: "block",
                        marginTop: 4,
                        fontSize: 11,
                        color: "var(--amber)",
                        fontWeight: 600,
                      }}
                    >
                      ⚠ Amount will change from{" "}
                      {formatCurrency(claim.totalClaimAmount)} →{" "}
                      {formatCurrency(updatedClaimAmount)}
                    </small>
                  ) : (
                    <small
                      style={{
                        display: "block",
                        marginTop: 4,
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {claim.status === "DRAFT" && target === "PREAUTH_PENDING"
                        ? "Enter the estimated amount for pre-authorization."
                        : "Update if the insurance company approved a different amount. Leave as-is to keep current amount."}
                    </small>
                  )}
                  {claim.status === "DRAFT" &&
                    target === "PREAUTH_PENDING" &&
                    (!updatedClaimAmount || updatedClaimAmount <= 0) && (
                      <small
                        className="field-error"
                        style={{ display: "block", marginTop: 4 }}
                      >
                        Claim amount is required and must be greater than 0.
                      </small>
                    )}
                </div>
              )}
              {target === "FINAL_APPROVED" && (
                <div className="action-panel__audit-section">
                  <div
                    className="action-panel__risk-warning action-panel__risk-warning--low"
                    style={{
                      borderColor: "var(--accent-primary)",
                      color: "var(--accent-primary)",
                      marginBottom: 12,
                      display: "flex",
                      gap: "10px",
                      alignItems: "flex-start",
                    }}
                  >
                    <span>?</span>
                    <div>
                      <strong>Verify Deposit Collected</strong>
                      <p style={{ marginTop: 4, fontSize: 12 }}>
                        Is the collected deposit amount correct? Or did you
                        collect more deposit? If yes, please enter the updated
                        amount.
                      </p>
                    </div>
                  </div>
                  <label className="field">
                    <span>Collected Deposit Amount (₹)</span>
                    <input
                      className="input input-mono"
                      type="number"
                      value={updatedDepositAmount}
                      onChange={(e) =>
                        setUpdatedDepositAmount(Number(e.target.value))
                      }
                      min={0}
                      step="0.01"
                      disabled={isBlocked}
                    />
                  </label>
                  {updatedDepositAmount !== claim.depositAmount && (
                    <small
                      style={{
                        display: "block",
                        marginTop: 4,
                        fontSize: 11,
                        color: "var(--amber)",
                        fontWeight: 600,
                      }}
                    >
                      ⚠ Deposit will be updated from{" "}
                      {formatCurrency(claim.depositAmount || 0)} →{" "}
                      {formatCurrency(updatedDepositAmount)}
                    </small>
                  )}
                </div>
              )}

              {target === "DEPOSIT_RETURNED" && (
                <div className="action-panel__audit-section">
                  <div
                    className="action-panel__risk-warning action-panel__risk-warning--high"
                    style={{
                      borderColor: "var(--amber)",
                      color: "var(--amber)",
                      display: "flex",
                      gap: "10px",
                      alignItems: "flex-start",
                      marginBottom: 12,
                    }}
                  >
                    <span>?</span>
                    <div>
                      <strong>Refund Confirmation</strong>
                      <p style={{ marginTop: 4, fontSize: 12 }}>
                        Did you return the refund amount of{" "}
                        <strong>{formatCurrency(claim.refundAmount)}</strong> to
                        the patient?
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Audit reason */}
              <div className="action-panel__audit-section">
                <label className="field">
                  <span>
                    Audit Reason{" "}
                    <span className="action-panel__required">*</span>
                  </span>
                  <textarea
                    className="input textarea"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Provide an operational reason for this transition (minimum 8 characters)…"
                    rows={3}
                    disabled={isBlocked}
                  />
                </label>
                {remarks.length > 0 && !remarksValid && (
                  <small className="field-error">
                    Minimum 8 characters required for audit trail.
                  </small>
                )}
                <div className="action-panel__char-count">
                  <span
                    style={{
                      color: remarksValid
                        ? "var(--green)"
                        : "var(--text-tertiary)",
                    }}
                  >
                    {remarks.length} chars{" "}
                    {remarksValid ? "✓" : `(need ${8 - remarks.length} more)`}
                  </span>
                </div>
              </div>

              {mutation.isError && <ErrorPanel error={mutation.error} />}

              <div className="modal-footer">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setTarget(undefined);
                    setRemarks("");
                    setAlNumber("");
                    setUpdatedClaimAmount(claim.totalClaimAmount);
                    setUpdatedDepositAmount(claim.depositAmount || 0);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant={risk === "critical" ? "danger" : "primary"}
                  disabled={
                    !remarksValid ||
                    !alNumberValid ||
                    isBlocked ||
                    mutation.isPending ||
                    (claim.status === "DRAFT" &&
                      target === "PREAUTH_PENDING" &&
                      (!updatedClaimAmount || updatedClaimAmount <= 0))
                  }
                  onClick={() =>
                    target &&
                    mutation.mutate({
                      status: target,
                      reason: remarks,
                      ...(needsAlNumber
                        ? { claimNumber: alNumber.trim() }
                        : {}),
                      ...(canEditAmount &&
                      (updatedClaimAmount !== claim.totalClaimAmount ||
                        claim.status === "DRAFT")
                        ? { totalClaimAmount: updatedClaimAmount }
                        : {}),
                      ...(target === "FINAL_APPROVED"
                        ? { depositAmount: updatedDepositAmount }
                        : {}),
                    })
                  }
                >
                  {mutation.isPending
                    ? "Processing…"
                    : `Confirm → ${labelize(target)}`}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </aside>
  );
}
