import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import {
  alertApi,
  auditApi,
  communicationApi,
  claimsApi,
  depositApi,
  settlementApi,
  timelineApi,
} from "../../api/services";
import { AlertPlaybookPanel } from "../../components/alerts/AlertPlaybookPanel";
import { FinancialControlDeck } from "../../components/claims/FinancialControlDeck";
import { WorkflowActionsPanel } from "../../components/claims/WorkflowActionsPanel";
import { WorkflowRail } from "../../components/claims/WorkflowRail";
import { DocumentManager } from "../../components/documents/DocumentManager";
import { BillBreakdownPanel } from "../../components/claims/BillBreakdownPanel";
import { SettlementPanel } from "../../components/settlements/SettlementPanel";
import { ClaimTimeline } from "../../components/timeline/ClaimTimeline";
import { Card, CardHeader } from "../../components/ui/Card";
import { ErrorPanel } from "../../components/ui/ErrorPanel";
import { Skeleton } from "../../components/ui/Skeleton";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { canSeeFinance } from "../../constants/operations";
import { useAuthStore } from "../../store/auth.store";
import type { CommunicationMedium } from "../../types/domain";
import {
  ageInDays,
  formatCurrency,
  formatDateTime,
  labelize,
  nameOf,
} from "../../utils/format";

export function ClaimDetailsPage() {
  const { claimId = "" } = useParams();
  const user = useAuthStore((state) => state.user);
  const qc = useQueryClient();
  const [commText, setCommText] = useState("");
  const [medium, setMedium] = useState<CommunicationMedium>("PORTAL");
  const [activeTab, setActiveTab] = useState<"overview" | "finance">(
    "overview"
  );

  const claim = useQuery({
    queryKey: ["claim", claimId],
    queryFn: () => claimsApi.get(claimId),
  });
  const timeline = useQuery({
    queryKey: ["timeline", claimId],
    queryFn: () => timelineApi.claim(claimId),
  });
  const alerts = useQuery({
    queryKey: ["claim-alerts", claimId],
    queryFn: () => alertApi.byClaim(claimId),
  });
  const communications = useQuery({
    queryKey: ["communications", claimId],
    queryFn: () => communicationApi.list(claimId),
  });
  const audit = useQuery({
    queryKey: ["audit", claimId],
    queryFn: () => auditApi.entity(claimId),
  });
  const settlement = useQuery({
    queryKey: ["settlement", claimId],
    queryFn: () => settlementApi.getByClaim(claimId),
    retry: false,
  });
  const deposit = useQuery({
    queryKey: ["deposit", claimId],
    queryFn: () => depositApi.getByClaim(claimId),
    retry: false,
  });

  const addCommunication = useMutation({
    mutationFn: () =>
      communicationApi.create({
        claimId,
        type: "FOLLOW_UP",
        medium,
        remarks: commText,
        createdBy: user?._id,
      }),
    onSuccess: () => {
      setCommText("");
      qc.invalidateQueries({ queryKey: ["communications", claimId] });
      qc.invalidateQueries({ queryKey: ["timeline", claimId] });
    },
  });

  const auditExceptions = useMemo(
    () => audit.data?.data.slice(0, 6) ?? [],
    [audit.data?.data]
  );

  if (claim.isLoading) return <Skeleton rows={10} />;
  if (claim.isError || !claim.data) return <ErrorPanel error={claim.error} />;

  const data = claim.data;
  const locked = data.status === "CLOSED";
  const ageing = ageInDays(data.createdAt);
  const criticalAgeing = ageing >= 60;

  return (
    <div className="claim-cockpit immersive-cockpit">
      <div className="cockpit-main">
        <section className="cockpit-hero premium-panel">
          <div>
            <p className="eyebrow">Claim Operational Cockpit</p>
            <h1>{data.claimNumber ?? data._id}</h1>
            <span>
              {data.type} workflow · {ageing} days ageing · Updated{" "}
              {formatDateTime(data.updatedAt)}
            </span>
          </div>
          <div className="cockpit-hero-status">
            <StatusBadge value={data.status} />
            <strong>{formatCurrency(data.totalClaimAmount)}</strong>
          </div>
        </section>

        {/* Tab Switcher */}
        <div
          className="no-print"
          style={{
            display: "flex",
            gap: 8,
            borderBottom: "1px solid var(--border)",
            marginBottom: 20,
            paddingBottom: 2,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            style={{
              padding: "10px 16px",
              fontSize: 14,
              fontWeight: 600,
              color:
                activeTab === "overview"
                  ? "var(--accent-primary)"
                  : "var(--text-secondary)",
              borderBottom:
                activeTab === "overview"
                  ? "2px solid var(--accent-primary)"
                  : "2px solid transparent",
              background: "none",
              border: "none",
              cursor: "pointer",
              transition: "all var(--dur-fast)",
            }}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("finance")}
            style={{
              padding: "10px 16px",
              fontSize: 14,
              fontWeight: 600,
              color:
                activeTab === "finance"
                  ? "var(--accent-primary)"
                  : "var(--text-secondary)",
              borderBottom:
                activeTab === "finance"
                  ? "2px solid var(--accent-primary)"
                  : "2px solid transparent",
              background: "none",
              border: "none",
              cursor: "pointer",
              transition: "all var(--dur-fast)",
              position: "relative",
            }}
          >
            Finance Console
            {data.status === "SETTLEMENT_PENDING" && (
              <span
                style={{
                  position: "absolute",
                  top: 8,
                  right: 0,
                  width: 8,
                  height: 8,
                  background: "var(--red)",
                  borderRadius: "50%",
                }}
              />
            )}
          </button>
        </div>

        {activeTab === "overview" && (
          <>
            {locked && (
              <div className="audit-warning">
                Closed claim is immutable. SUPER_ADMIN reopen requires a
                confirmation modal and audit reason.
              </div>
            )}
            {criticalAgeing && !locked && (
              <div className="audit-warning">
                Ageing risk: this claim is inside system's courier-delay
                escalation territory.
              </div>
            )}

            <WorkflowRail claim={data} />
            <FinancialControlDeck
              claim={data}
              settlement={settlement.data}
              deposit={deposit.data}
            />

            {/* Separated Finance Console CTA Summary Card */}
            {canSeeFinance(user?.role) &&
              (() => {
                const settlementStatuses = [
                  "SETTLEMENT_PENDING",
                  "SETTLED",
                  "DEPOSIT_PENDING",
                  "DEPOSIT_RETURNED",
                  "CLOSED",
                ];
                const isSettlementReady = settlementStatuses.includes(
                  data.status
                );

                if (isSettlementReady) {
                  if (data.status === "SETTLEMENT_PENDING") {
                    return (
                      <section
                        className="card premium-panel"
                        style={{ border: "1.5px dashed var(--accent-primary)" }}
                      >
                        <CardHeader
                          title="Action Required: Finalize Settlement"
                          eyebrow="Department-wise final breakdown & payer contract rules pending"
                        />
                        <div
                          style={{
                            padding: "0 20px 20px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 16,
                          }}
                        >
                          <p
                            style={{
                              fontSize: 13,
                              color: "var(--text-secondary)",
                              margin: 0,
                              maxWidth: "600px",
                            }}
                          >
                            This claim requires department-wise settlement
                            mapping, deductions calculation, and discount
                            finalization. Click below to open the console.
                          </p>
                          <button
                            type="button"
                            onClick={() => setActiveTab("finance")}
                            className="btn btn-primary"
                          >
                            Go to Finance Console →
                          </button>
                        </div>
                      </section>
                    );
                  } else {
                    return (
                      <Card className="premium-panel">
                        <CardHeader
                          title="Finance Execution Finalized"
                          eyebrow="Settled claim records & vendor payouts"
                        />
                        <div
                          style={{
                            padding: "0 20px 20px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 16,
                          }}
                        >
                          <div>
                          <div style={{ display: "flex", gap: 16 }}>
                            <div>
                              <span style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", display: "block" }}>Net Settled (Before TDS)</span>
                              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: "4px 0 0 0" }}>
                                {formatCurrency((settlement.data?.netPayable ?? 0) + (settlement.data?.tds ?? 0))}
                              </h2>
                            </div>
                            <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: 16 }}>
                              <span style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", display: "block" }}>Net Settled (After TDS)</span>
                              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--green)", margin: "4px 0 0 0" }}>
                                {formatCurrency(settlement.data?.netPayable ?? 0)}
                              </h2>
                            </div>
                          </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveTab("finance")}
                            className="btn btn-secondary"
                          >
                            View Settlement &amp; Breakdown details →
                          </button>
                        </div>
                      </Card>
                    );
                  }
                } else {
                  return (
                    <Card className="premium-panel restricted-card">
                      <CardHeader
                        title="Finance execution console"
                        eyebrow="Settlement · allocations · refunds"
                      />
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "16px 20px",
                          background:
                            "color-mix(in srgb, var(--amber) 8%, transparent)",
                          border:
                            "1px solid color-mix(in srgb, var(--amber) 25%, transparent)",
                          borderRadius: "var(--r-lg)",
                          fontSize: 13,
                          color: "var(--text-secondary)",
                        }}
                      >
                        <span style={{ fontSize: 20 }}>🔒</span>
                        <div>
                          <strong style={{ display: "block", marginBottom: 2 }}>
                            Settlement not available yet
                          </strong>
                          The claim must reach{" "}
                          <strong>Settlement Pending</strong> status before the
                          finance console is unlocked. Current status:{" "}
                          <StatusBadge value={data.status} compact />
                        </div>
                      </div>
                    </Card>
                  );
                }
              })()}

            <div className="cockpit-matrix">
              <Card className="premium-panel identity-card">
                <CardHeader
                  title="Patient and insurer identity"
                  eyebrow="Primary operational record"
                />
                <dl className="detail-list">
                  <dt>Patient ID</dt>
                  <dd>{data.patientId}</dd>
                  <dt>Insurance company</dt>
                  <dd>
                    {nameOf(
                      (data as any).insuranceCompany || data.insuranceCompanyId
                    ) || "Not assigned"}
                  </dd>
                  {data.doctor && (
                    <>
                      <dt>Doctor</dt>
                      <dd>
                        Dr.{" "}
                        {typeof data.doctor === "object"
                          ? data.doctor.name
                          : data.doctor}
                      </dd>
                    </>
                  )}
                  <dt>Department</dt>
                  <dd>{nameOf(data.departmentId) || "Not assigned"}</dd>
                  <dt>Created by</dt>
                  <dd>{nameOf(data.createdBy)}</dd>
                  <dt>Operational notes</dt>
                  <dd>
                    {Array.isArray(data.remarks)
                      ? data.remarks.length
                        ? data.remarks.join(", ")
                        : "No operational notes"
                      : data.remarks?.trim()
                        ? data.remarks
                        : "No operational notes"}
                  </dd>
                </dl>
              </Card>

              <AlertPlaybookPanel
                alerts={alerts.data ?? []}
                role={user?.role}
              />
            </div>

            <Card className="premium-panel">
              <CardHeader
                title="Chronology timeline"
                eyebrow="Status · communications · documents · settlements · alerts · audit"
              />
              {timeline.isError ? (
                <ErrorPanel error={timeline.error} />
              ) : (
                <ClaimTimeline events={timeline.data ?? []} />
              )}
            </Card>

            <Card className="premium-panel">
              <CardHeader
                title="Secure document control"
                eyebrow="Versioned claim evidence"
              />
              <DocumentManager claimId={data.id || data._id} locked={locked} />
            </Card>

            <div className="cockpit-matrix">
              <Card className="premium-panel">
                <CardHeader
                  title="Communication console"
                  eyebrow="TPA / insurer / patient log"
                />
                <form
                  className="communication-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (commText.length >= 2) addCommunication.mutate();
                  }}
                >
                  <select
                    className="input"
                    value={medium}
                    onChange={(event) =>
                      setMedium(event.target.value as CommunicationMedium)
                    }
                    disabled={locked}
                  >
                    <option>EMAIL</option>
                    <option>PORTAL</option>
                    <option>COURIER</option>
                    <option>PHONE</option>
                    <option>IN_PERSON</option>
                  </select>
                  <input
                    className="input"
                    value={commText}
                    onChange={(event) => setCommText(event.target.value)}
                    placeholder="Record operational communication"
                    disabled={locked}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={locked || addCommunication.isPending}
                  >
                    Add
                  </button>
                </form>
                {communications.data?.data.map((item) => (
                  <div className="alert-row" key={item._id}>
                    <StatusBadge value={item.medium} compact />
                    <span>
                      {item.remarks} · {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                ))}
              </Card>

              <Card className="premium-panel audit-console">
                <CardHeader
                  title="Audit trace"
                  eyebrow="System immutable activity"
                />
                {auditExceptions.map((log) => (
                  <div className="audit-row" key={log._id}>
                    <strong>{labelize(log.action)}</strong>
                    <span>
                      {labelize(log.module)} · {formatDateTime(log.createdAt)}
                    </span>
                  </div>
                ))}
              </Card>
            </div>
          </>
        )}

        {activeTab === "finance" && (
          <>
            <WorkflowRail claim={data} />
            {canSeeFinance(user?.role) ? (
              <>
                <BillBreakdownPanel claim={data} />
                {(() => {
                  const settlementStatuses = [
                    "SETTLEMENT_PENDING",
                    "SETTLED",
                    "DEPOSIT_PENDING",
                    "DEPOSIT_RETURNED",
                    "CLOSED",
                  ];
                  const isSettlementReady = settlementStatuses.includes(
                    data.status
                  );

                  return isSettlementReady ? (
                    <Card className="premium-panel">
                      <CardHeader
                        title="Finance execution console"
                        eyebrow="Settlement · allocations · refunds"
                      />
                      <SettlementPanel claim={data} />
                    </Card>
                  ) : (
                    <Card className="premium-panel restricted-card">
                      <CardHeader
                        title="Finance execution console"
                        eyebrow="Settlement · allocations · refunds"
                      />
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "16px 20px",
                          background:
                            "color-mix(in srgb, var(--amber) 8%, transparent)",
                          border:
                            "1px solid color-mix(in srgb, var(--amber) 25%, transparent)",
                          borderRadius: "var(--r-lg)",
                          fontSize: 13,
                          color: "var(--text-secondary)",
                        }}
                      >
                        <span style={{ fontSize: 20 }}>🔒</span>
                        <div>
                          <strong style={{ display: "block", marginBottom: 2 }}>
                            Settlement not available yet
                          </strong>
                          The claim must reach{" "}
                          <strong>Settlement Pending</strong> status before the
                          finance console is unlocked. Current status:{" "}
                          <StatusBadge value={data.status} compact />
                        </div>
                      </div>
                    </Card>
                  );
                })()}
              </>
            ) : (
              <Card className="premium-panel restricted-card">
                <CardHeader
                  title="Finance execution restricted"
                  eyebrow="Role-based control"
                />
                <p>
                  Settlement finalization, TDS, deductions, allocation, and
                  refund execution are visible to finance/admin roles.
                </p>
              </Card>
            )}
          </>
        )}
      </div>

      <WorkflowActionsPanel claim={data} />
    </div>
  );
}
