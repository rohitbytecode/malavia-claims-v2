import type { AlertSeverity, ClaimStatus } from "../../types/domain";
import { labelize } from "../../utils/format";
import { cn } from "../../lib/cn";
const tone: Partial<Record<ClaimStatus | AlertSeverity | string, string>> = { DRAFT:"neutral", PREAUTH_PENDING:"warning", PREAUTH_APPROVED:"success", PREAUTH_REJECTED:"danger", RECONSIDERATION_PENDING:"warning", FINAL_APPROVAL_PENDING:"warning", FINAL_APPROVED:"success", FINAL_REJECTED:"danger", DOCUMENTS_PENDING:"warning", SUBMITTED:"info", QUERY_RAISED:"danger", QUERY_RESPONDED:"info", QUERY_RESPONSED:"info", SETTLEMENT_PENDING:"warning", SETTLED:"success", DEPOSIT_PENDING:"warning", DEPOSIT_RETURNED:"success", CLOSED:"neutral", LOW:"neutral", MEDIUM:"warning", HIGH:"danger", CRITICAL:"critical" };
export function StatusBadge({ value, compact }: { value?: string; compact?: boolean }) { return <span className={cn("badge", `badge-${tone[value ?? ""] ?? "neutral"}`, compact && "badge-compact")}>{labelize(value)}</span>; }
