import { useMemo, useState } from "react";
import type { TimelineEvent } from "../../types/domain";
import {
  formatDate,
  formatDateTime,
  labelize,
  nameOf,
} from "../../utils/format";
import { StatusBadge } from "../ui/StatusBadge";

/* ── Event metadata ── */
const EVENT_META: Record<
  TimelineEvent["type"],
  {
    icon: string;
    label: string;
    colorVar: string;
  }
> = {
  STATUS: { icon: "↗", label: "Status Change", colorVar: "var(--accent)" },
  COMMUNICATION: {
    icon: "✉",
    label: "Communication",
    colorVar: "var(--steel)",
  },
  DOCUMENT: { icon: "◫", label: "Document", colorVar: "var(--amber)" },
  SETTLEMENT: { icon: "₹", label: "Settlement", colorVar: "var(--green)" },
  ALERT: { icon: "⚠", label: "Alert", colorVar: "var(--red)" },
  AUDIT: { icon: "⌁", label: "Audit Event", colorVar: "var(--text-tertiary)" },
};

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

interface ClaimTimelineProps {
  events: TimelineEvent[];
  compact?: boolean;
}

export function ClaimTimeline({ events, compact = false }: ClaimTimelineProps) {
  const [filter, setFilter] = useState<TimelineEvent["type"] | "ALL">("ALL");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  /* Group events by date, newest first */
  const { grouped, dayKeys } = useMemo(() => {
    const sorted = [...events]
      .filter((e) => filter === "ALL" || e.type === filter)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    const map: Record<string, TimelineEvent[]> = {};
    for (const ev of sorted) {
      const key = formatDate(ev.createdAt);
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return { grouped: map, dayKeys: Object.keys(map) };
  }, [events, filter]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: events.length };
    for (const ev of events) {
      counts[ev.type] = (counts[ev.type] ?? 0) + 1;
    }
    return counts;
  }, [events]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const FILTER_TYPES: (TimelineEvent["type"] | "ALL")[] = [
    "ALL",
    "STATUS",
    "COMMUNICATION",
    "DOCUMENT",
    "SETTLEMENT",
    "ALERT",
    "AUDIT",
  ];

  return (
    <div className="timeline">
      {/* ── Filter bar ── */}
      <div className="timeline__filters">
        {FILTER_TYPES.map((type) => {
          const meta = type === "ALL" ? null : EVENT_META[type];
          const count = typeCounts[type] ?? 0;
          return (
            <button
              key={type}
              className={`timeline__filter-btn${filter === type ? " timeline__filter-btn--active" : ""}`}
              onClick={() => setFilter(type)}
              type="button"
              style={
                filter === type && meta
                  ? { borderColor: meta.colorVar, color: meta.colorVar }
                  : undefined
              }
            >
              {meta ? <span>{meta.icon}</span> : null}
              <span>{type === "ALL" ? "All Events" : labelize(type)}</span>
              {count > 0 && (
                <span className="timeline__filter-count">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Events ── */}
      {events.length === 0 && (
        <div className="timeline__empty">
          <p>No timeline events recorded yet.</p>
          <span>
            Events populate from status changes, communications, settlements,
            documents, alerts, and audit records.
          </span>
        </div>
      )}

      {dayKeys.map((day) => (
        <div key={day} className="timeline__day">
          <div className="timeline__day-marker">
            <span>{day}</span>
            <div className="timeline__day-line" />
          </div>

          <div className="timeline__events">
            {(grouped[day] ?? []).map((ev, idx) => {
              const id = ev.id ?? ev._id ?? `${ev.type}-${ev.createdAt}-${idx}`;
              const meta = EVENT_META[ev.type] ?? {
                icon: "*",
                label: labelize(ev.type),
                colorVar: "var(--text-tertiary",
              };
              const isExpanded = expandedIds.has(id) || (!compact && idx < 2);
              const hasDetail = !!(
                ev.fromStatus ||
                ev.remarks ||
                ev.message ||
                ev.attachmentName
              );

              return (
                <div
                  key={id}
                  className={`timeline__event timeline__event--${ev.type.toLowerCase()}`}
                  style={
                    { "--event-color": meta.colorVar } as React.CSSProperties
                  }
                >
                  {/* Spine */}
                  <div className="timeline__spine">
                    <div
                      className="timeline__icon"
                      style={{
                        background: `${meta.colorVar}18`,
                        borderColor: `${meta.colorVar}40`,
                        color: meta.colorVar,
                      }}
                    >
                      {meta.icon}
                    </div>
                    {idx < (grouped[day]?.length ?? 0) - 1 && (
                      <div className="timeline__connector" />
                    )}
                  </div>

                  {/* Card */}
                  <div className="timeline__card">
                    <button
                      className="timeline__card-header"
                      onClick={() => hasDetail && toggleExpand(id)}
                      type="button"
                      disabled={!hasDetail}
                    >
                      <div className="timeline__card-left">
                        <span
                          className="timeline__event-label"
                          style={{ color: meta.colorVar }}
                        >
                          {meta.label}
                        </span>
                        <span className="timeline__event-title">
                          {ev.title ??
                            (ev.toStatus
                              ? `→ ${labelize(ev.toStatus)}`
                              : labelize(ev.type))}
                        </span>
                      </div>
                      <div className="timeline__card-right">
                        {ev.toStatus && (
                          <StatusBadge value={ev.toStatus} compact />
                        )}
                        {ev.severity && (
                          <span
                            className="timeline__severity"
                            style={{
                              color:
                                SEVERITY_ORDER[ev.severity] >= 3
                                  ? "var(--red)"
                                  : "var(--amber)",
                            }}
                          >
                            {ev.severity}
                          </span>
                        )}
                        <time className="timeline__time">
                          {formatDateTime(ev.createdAt)}
                        </time>
                        {hasDetail && (
                          <span
                            className={`timeline__expand-icon${isExpanded ? " timeline__expand-icon--open" : ""}`}
                          >
                            ▾
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Actor */}
                    {ev.actor && (
                      <div className="timeline__actor">
                        <span className="timeline__actor-dot" />
                        <span>{nameOf(ev.actor)}</span>
                      </div>
                    )}

                    {/* Expanded detail */}
                    {isExpanded && hasDetail && (
                      <div className="timeline__detail">
                        {ev.fromStatus && ev.toStatus && (
                          <div className="timeline__transition">
                            <StatusBadge value={ev.fromStatus} compact />
                            <span className="timeline__transition-arrow">
                              →
                            </span>
                            <StatusBadge value={ev.toStatus} compact />
                          </div>
                        )}
                        {(ev.remarks || ev.message) && (
                          <p className="timeline__remark">
                            {ev.remarks ?? ev.message}
                          </p>
                        )}
                        {ev.attachmentName && (
                          <div className="timeline__attachment">
                            <span>◫</span>
                            <span>{ev.attachmentName}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
