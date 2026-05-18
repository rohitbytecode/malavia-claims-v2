import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { claimsApi } from "../../api/services";
import {
  allowedTransitions,
  canRoleTransition,
} from "../../constants/workflow";
import { canCloseClaims, canSeeFinance } from "../../constants/operations";
import { useAuthStore } from "../../store/auth.store";
import type { Claim, ClaimStatus } from "../../types/domain";
import { labelize } from "../../utils/format";
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

  const transitions = useMemo(
    () =>
      allowedTransitions(claim.type, claim.status).filter((s) =>
        user ? canRoleTransition(user.role, s) : false
      ),
    [claim.status, claim.type, user]
  );

  const mutation = useMutation({
    mutationFn: ({ status, reason }: { status: ClaimStatus; reason: string }) =>
      claimsApi.transition(claim._id, {
        toStatus: status,
        remarks: reason,
        performedBy: user?._id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["claim", claim._id] });
      qc.invalidateQueries({ queryKey: ["timeline", claim._id] });
      setTarget(undefined);
      setRemarks("");
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
              return (
                <button
                  key={status}
                  className={`action-panel__transition-btn action-panel__transition-btn--${r}`}
                  onClick={() => setTarget(status)}
                  style={
                    { "--risk-color": RISK_COLORS[r] } as React.CSSProperties
                  }
                  type="button"
                >
                  <span className="action-panel__transition-arrow">→</span>
                  <span>{labelize(status)}</span>
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
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant={risk === "critical" ? "danger" : "primary"}
                  disabled={!remarksValid || isBlocked || mutation.isPending}
                  onClick={() =>
                    target &&
                    mutation.mutate({ status: target, reason: remarks })
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
