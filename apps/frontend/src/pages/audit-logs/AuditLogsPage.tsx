import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { auditApi } from "../../api/services";
import { Skeleton } from "../../components/ui/Skeleton";
import { ErrorPanel } from "../../components/ui/ErrorPanel";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { formatDateTime } from "../../utils/format";

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // Fetch audit logs with react-query
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["audit-logs", page, moduleFilter, actionFilter, searchQuery],
    queryFn: () =>
      auditApi.list({
        page,
        limit,
        module: moduleFilter || undefined,
        action: actionFilter || undefined,
        search: searchQuery || undefined,
      }),
  });

  const logs = data?.data ?? [];
  const pagination = data?.pagination ?? { total: 0, page: 1, limit: 20, totalPages: 1 };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleModuleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setModuleFilter(e.target.value);
    setPage(1);
  };

  const handleActionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActionFilter(e.target.value);
    setPage(1);
  };

  const clearFilters = () => {
    setModuleFilter("");
    setActionFilter("");
    setSearchQuery("");
    setPage(1);
  };

  // Helper to render difference between previousData and newData
  const renderDataDiff = (prev: any, curr: any) => {
    const prevData = prev || {};
    const currData = curr || {};

    const allKeys = Array.from(
      new Set([...Object.keys(prevData), ...Object.keys(currData)])
    ).filter(
      (key) =>
        !["__v", "updatedAt", "createdAt", "password", "refreshTokenHashes"].includes(key)
    );

    const stringifyVal = (val: any) => {
      if (val === null) return "null";
      if (val === undefined) return "undefined";
      if (typeof val === "object") return JSON.stringify(val, null, 2);
      return String(val);
    };

    const diffs = allKeys
      .map((key) => {
        const prevVal = prevData[key];
        const currVal = currData[key];
        const isPrevDefined = key in prevData;
        const isCurrDefined = key in currData;

        const prevStr = stringifyVal(prevVal);
        const currStr = stringifyVal(currVal);

        if (isPrevDefined && isCurrDefined && prevStr === currStr) {
          return null;
        }

        return {
          key,
          prev: isPrevDefined ? prevStr : null,
          curr: isCurrDefined ? currStr : null,
        };
      })
      .filter(Boolean);

    if (diffs.length === 0) {
      return (
        <div style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)" }}>
          No field changes detected or object was created/deleted without specific field differences.
        </div>
      );
    }

    return (
      <div style={{ overflowX: "auto", marginTop: "16px" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "13px",
            textAlign: "left",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "2px solid rgba(255,255,255,0.08)", color: "var(--text-secondary)" }}>
              <th style={{ padding: "12px 8px" }}>Field</th>
              <th style={{ padding: "12px 8px" }}>Previous Value</th>
              <th style={{ padding: "12px 8px" }}>New Value</th>
            </tr>
          </thead>
          <tbody>
            {diffs.map((d: any) => (
              <tr
                key={d.key}
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  verticalAlign: "top",
                }}
              >
                <td style={{ padding: "12px 8px", fontWeight: "600", color: "var(--text-main)" }}>
                  {d.key}
                </td>
                <td
                  style={{
                    padding: "12px 8px",
                    background: d.prev !== null ? "rgba(239, 68, 68, 0.08)" : "transparent",
                    color: d.prev !== null ? "#ef4444" : "var(--text-muted)",
                    fontFamily: "monospace",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}
                >
                  {d.prev !== null ? d.prev : "(none)"}
                </td>
                <td
                  style={{
                    padding: "12px 8px",
                    background: d.curr !== null ? "rgba(16, 185, 129, 0.08)" : "transparent",
                    color: d.curr !== null ? "#10b981" : "var(--text-muted)",
                    fontFamily: "monospace",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}
                >
                  {d.curr !== null ? d.curr : "(none)"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="page-stack">
      {/* Page Header */}
      <div className="page-title">
        <p className="eyebrow">System Compliance</p>
        <h1>Audit Logs</h1>
        <span>Track and review every action performed by operators, claim executives, and administrators.</span>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="premium-panel"
        style={{
          padding: "16px",
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--panel-bg)",
          borderRadius: "8px",
          border: "1px solid var(--border-color)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", flex: 1 }}>
          <div style={{ minWidth: "200px" }}>
            <input
              type="text"
              placeholder="Search Entity ID..."
              className="input"
              value={searchQuery}
              onChange={handleSearchChange}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ minWidth: "150px" }}>
            <select className="input" value={moduleFilter} onChange={handleModuleChange} style={{ width: "100%" }}>
              <option value="">All Modules</option>
              <option value="CLAIMS">Claims</option>
              <option value="USER">User</option>
              <option value="DEPOSIT">Deposit</option>
              <option value="SETTLEMENT">Settlement</option>
              <option value="ALLOCATION">Allocation</option>
              <option value="COMMUNICATION">Communication</option>
            </select>
          </div>

          <div style={{ minWidth: "150px" }}>
            <select className="input" value={actionFilter} onChange={handleActionChange} style={{ width: "100%" }}>
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="STATUS_CHANGE">Status Change</option>
              <option value="AUTH_LOGIN">Login</option>
            </select>
          </div>
        </div>

        {(moduleFilter || actionFilter || searchQuery) && (
          <Button type="button" variant="secondary" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Loading & Error States */}
      {isLoading && <Skeleton rows={10} />}
      {isError && <ErrorPanel error={error} />}

      {/* Logs Table */}
      {!isLoading && !isError && (
        <div className="dt-shell">
          <div className="dt-viewport" style={{ overflowX: "auto" }}>
            <table className="dt-table dt-table--compact">
              <thead>
                <tr>
                  <th className="dt-th">Date & Time</th>
                  <th className="dt-th">Module</th>
                  <th className="dt-th">Action</th>
                  <th className="dt-th">Entity ID</th>
                  <th className="dt-th">Performed By</th>
                  <th className="dt-th" style={{ textAlign: "right" }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "40px" }}>
                      <div className="text-muted">No audit logs found matching the selected filters.</div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log: any) => (
                    <tr className="dt-row" key={log._id}>
                      <td className="dt-td" style={{ whiteSpace: "nowrap" }}>
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="dt-td">
                        <StatusBadge value={log.module} compact />
                      </td>
                      <td className="dt-td">
                        <StatusBadge value={log.action} compact />
                      </td>
                      <td className="dt-td" style={{ fontFamily: "monospace", fontSize: "12px" }}>
                        {log.entityId}
                      </td>
                      <td className="dt-td">
                        {log.performedBy ? (
                          <div>
                            <strong>{log.performedBy.fullName}</strong>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                              @{log.performedBy.username}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted">System</span>
                        )}
                      </td>
                      <td className="dt-td" style={{ textAlign: "right" }}>
                        <Button type="button" variant="secondary" onClick={() => setSelectedLog(log)}>
                          View Changes
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="dt-pagination">
              <span className="dt-pagination__info">
                Page {pagination.page} of {pagination.totalPages} — {pagination.total} records
              </span>
              <div className="dt-pagination__controls">
                <button
                  type="button"
                  className="dt-pagination__btn"
                  disabled={page === 1}
                  onClick={() => setPage(1)}
                >
                  «
                </button>
                <button
                  type="button"
                  className="dt-pagination__btn"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ‹
                </button>
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(page - 2, pagination.totalPages - 4)) + i;
                  if (p < 1 || p > pagination.totalPages) return null;
                  return (
                    <button
                      type="button"
                      key={p}
                      className={`dt-pagination__btn ${page === p ? "dt-pagination__btn--active" : ""}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="dt-pagination__btn"
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  ›
                </button>
                <button
                  type="button"
                  className="dt-pagination__btn"
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage(pagination.totalPages)}
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Details Diff Modal */}
      {selectedLog && (
        <Modal
          open={!!selectedLog}
          title={`Audit Event Details: ${selectedLog.action} on ${selectedLog.module}`}
          onClose={() => setSelectedLog(null)}
        >
          <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                marginBottom: "20px",
                paddingBottom: "16px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                fontSize: "13px",
              }}
            >
              <div>
                <span style={{ color: "var(--text-muted)" }}>Performed By:</span>
                <div>{selectedLog.performedBy?.fullName ?? "System"} (@{selectedLog.performedBy?.username ?? "system"})</div>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Date & Time:</span>
                <div>{formatDateTime(selectedLog.createdAt)}</div>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Target Entity ID:</span>
                <div style={{ fontFamily: "monospace" }}>{selectedLog.entityId}</div>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Action Reference:</span>
                <div>{selectedLog._id}</div>
              </div>
            </div>

            <h3 style={{ fontSize: "14px", margin: "16px 0 8px 0" }}>Changes State Comparison</h3>
            {renderDataDiff(selectedLog.previousData, selectedLog.newData)}
          </div>
          <div className="modal-footer">
            <Button type="button" onClick={() => setSelectedLog(null)}>
              Close Details
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
