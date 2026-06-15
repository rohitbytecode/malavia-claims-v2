import { useMemo } from "react";
import { allowedTransitions } from "../../constants/workflow";
import { getWorkflowStages } from "../../constants/operations";
import type { Claim } from "../../types/domain";
import { StatusBadge } from "../ui/StatusBadge";

interface WorkflowRailProps {
  claim: Claim;
  isPharmacist?: boolean;
}
const PHARMACIST_STATUSES = [
  "PREAUTH_PENDING",
  "PREAUTH_APPROVED",
  "SETTLEMENT_PENDING",
  "SETTLED",
];

export function WorkflowRail({ claim, isPharmacist }: WorkflowRailProps) {
  const stages = useMemo(() => {
    const all = getWorkflowStages(claim.type);
    if (!isPharmacist) return all;
    return all.filter((s) => PHARMACIST_STATUSES.includes(s.id));
  }, [claim.type, isPharmacist]);

  const currentIndex = stages.findIndex((s) => s.id === claim.status);
  const nextStatuses = allowedTransitions(claim.type, claim.status);
  const isClosed = claim.status === "CLOSED";

  const groupedStages = useMemo(() => {
    const groups: Record<string, typeof stages> = {};
    for (const stage of stages) {
      if (!groups[stage.group]) groups[stage.group] = [];
      groups[stage.group].push(stage);
    }
    return groups;
  }, [stages]);

  const groupOrder =
    claim.type === "CASHLESS"
      ? ["intake", "insurer", "approval", "finance", "closure"]
      : ["intake", "insurer", "finance", "closure"];

  const GROUP_LABELS: Record<string, string> = {
    intake: "Intake",
    insurer: "Insurer",
    approval: "Approval",
    finance: "Finance",
    closure: "Closure",
  };

  const getStageState = (stageId: string, idx: number) => {
    if (stageId === claim.status) return "active";
    if (currentIndex >= 0 && idx < currentIndex) return "complete";
    if (nextStatuses.includes(stageId as (typeof nextStatuses)[number]))
      return "possible";
    return "pending";
  };

  const progressPct =
    currentIndex >= 0
      ? Math.round((currentIndex / (stages.length - 1)) * 100)
      : 0;

  return (
    <section className="workflow-rail">
      {/* Header */}
      <div className="workflow-rail__header">
        <div>
          <p className="eyebrow">
            {claim.type === "CASHLESS"
              ? "Cashless Authorization"
              : "Reimbursement Submission"}{" "}
            Flow
          </p>
          <h2>Workflow Map</h2>
        </div>
        <div className="workflow-rail__status">
          <StatusBadge value={claim.status} />
          {isClosed && (
            <span className="workflow-rail__terminal-badge">Terminal</span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="workflow-rail__progress-track">
        <div
          className="workflow-rail__progress-fill"
          style={{ width: `${progressPct}%` }}
        />
        <span className="workflow-rail__progress-label">
          {progressPct}% complete
        </span>
      </div>

      {/* Stage groups */}
      <div className="workflow-rail__groups">
        {groupOrder.map((groupKey) => {
          const groupStages = groupedStages[groupKey];
          if (!groupStages?.length) return null;

          return (
            <div key={groupKey} className="workflow-rail__group">
              <div className="workflow-rail__group-label">
                {GROUP_LABELS[groupKey] ?? groupKey}
              </div>
              <div className="workflow-rail__group-stages">
                {groupStages.map((stage) => {
                  const idx = stages.findIndex((s) => s.id === stage.id);
                  const state = getStageState(stage.id, idx);

                  return (
                    <div
                      key={stage.id}
                      className={`workflow-stage workflow-stage--${state} workflow-stage--${stage.risk ?? "normal"}`}
                      title={
                        stage.irreversible
                          ? `${stage.label} (terminal -irreversible)`
                          : stage.label
                      }
                    >
                      <div className="workflow-stage__dot-wrap">
                        <div className="workflow-stage__dot">
                          {state === "complete" && <span>✓</span>}
                          {state === "active" && (
                            <span className="workflow-stage__pulse" />
                          )}
                          {state === "possible" && <span>→</span>}
                        </div>
                      </div>
                      <div className="workflow-stage__info">
                        <span className="workflow-stage__label">
                          {stage.label}
                        </span>
                        {stage.irreversible && (
                          <span className="workflow-stage__terminal-mark">
                            ⊗
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Next transitions */}
      {!isPharmacist && (
        <div className="workflow-rail__next">
          <span className="workflow-rail__next-label">
            System-allowed transitions
          </span>
          <div className="workflow-rail__next-chips">
            {nextStatuses.length > 0 ? (
              nextStatuses.map((s) => <StatusBadge key={s} value={s} compact />)
            ) : (
              <span className="workflow-rail__no-transitions">
                {isClosed
                  ? "Claim is closed -no further transitions"
                  : "No further transitions available"}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
