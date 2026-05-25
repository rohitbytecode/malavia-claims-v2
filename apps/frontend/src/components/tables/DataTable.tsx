import { useMemo, useState, useRef, useCallback, Fragment } from "react";
import { EmptyState } from "../ui/EmptyState";
import { cn } from "../../lib/cn";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  searchValue?: (row: T) => string;
  className?: string;
  pinned?: boolean;
  width?: string;
  align?: "left" | "right" | "center";
}

interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  title?: string;
  subtitle?: string;
  expandedRow?: (row: T) => React.ReactNode;
  compact?: boolean;
  actions?: React.ReactNode;
  isLoading?: boolean;
}

export function DataTable<T>({
  rows,
  columns,
  getRowId,
  onRowClick,
  title = "Records",
  subtitle,
  expandedRow,
  compact = true,
  actions,
  isLoading,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string>(columns[0]?.key ?? "");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(columns.map((c) => [c.key, true]))
  );
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;
  const searchRef = useRef<HTMLInputElement>(null);

  const toggleExpand = useCallback(
    (id: string, e: React.MouseEvent) => {
      if (!expandedRow) return;
      e.stopPropagation();
      setExpandedRows((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [expandedRow]
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      columns.some((col) =>
        (col.searchValue?.(row) ?? String(col.sortValue?.(row) ?? ""))
          .toLowerCase()
          .includes(term)
      )
    );
  }, [columns, query, rows]);

  const sorted = useMemo(() => {
    return filtered.toSorted((a, b) => {
      const col = columns.find((c) => c.key === sortKey);
      if (!col?.sortValue) return 0;
      const av = col.sortValue(a);
      const bv = col.sortValue(b);
      return (av > bv ? 1 : av < bv ? -1 : 0) * (direction === "asc" ? 1 : -1);
    });
  }, [columns, direction, filtered, sortKey]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const shown = columns.filter((c) => visible[c.key]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDirection("asc");
    }
    setPage(1);
  };

  return (
    <div className="dt-shell">
      {/* ── Toolbar ── */}
      <div className="dt-toolbar">
        <div className="dt-toolbar__left">
          <div>
            {title && <h2 className="dt-title">{title}</h2>}
            {subtitle && <p className="dt-subtitle">{subtitle}</p>}
          </div>
        </div>
        <div className="dt-toolbar__right">
          <div className="dt-search">
            <span className="dt-search__icon">⌕</span>
            <input
              ref={searchRef}
              className="dt-search__input"
              placeholder="Filter records…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              aria-label="Search table"
            />
            {query && (
              <button
                type="button"
                className="dt-search__clear"
                onClick={() => {
                  setQuery("");
                  searchRef.current?.focus();
                }}
              >
                ×
              </button>
            )}
          </div>
          {actions && <div className="dt-toolbar__actions">{actions}</div>}
        </div>
      </div>

      {/* ── Column toggles ── */}
      <div className="dt-col-toggles">
        <span className="dt-col-toggles__label">Columns</span>
        {columns.map((col) => (
          <label key={col.key} className="dt-col-toggle">
            <input
              type="checkbox"
              checked={visible[col.key] ?? true}
              onChange={(e) =>
                setVisible((v) => ({ ...v, [col.key]: e.target.checked }))
              }
            />
            <span>{col.header}</span>
          </label>
        ))}
        <span className="dt-count">
          {filtered.length === rows.length
            ? `${rows.length} records`
            : `${filtered.length} / ${rows.length}`}
        </span>
      </div>

      {/* ── Table ── */}
      <div className="dt-viewport" role="region" aria-label={title}>
        <table className={cn("dt-table", compact && "dt-table--compact")}>
          <thead>
            <tr>
              {expandedRow && <th className="dt-th dt-th--expand" />}
              {shown.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "dt-th",
                    col.pinned && "dt-th--pinned",
                    sortKey === col.key && "dt-th--sorted",
                    col.align === "right" && "dt-th--right"
                  )}
                  style={{ width: col.width }}
                >
                  <button
                    type="button"
                    className="dt-th__btn"
                    onClick={() => col.sortValue && handleSort(col.key)}
                    disabled={!col.sortValue}
                  >
                    {col.header}
                    {col.sortValue && (
                      <span className="dt-th__sort-icon">
                        {sortKey === col.key
                          ? direction === "asc"
                            ? " ↑"
                            : " ↓"
                          : " ↕"}
                      </span>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="dt-row dt-row--skeleton">
                    {expandedRow && <td />}
                    {shown.map((col) => (
                      <td key={col.key} className="dt-td">
                        <div className="dt-skeleton-cell" />
                      </td>
                    ))}
                  </tr>
                ))
              : paged.map((row) => {
                  const id = getRowId(row);
                  const isExpanded = expandedRows.has(id);
                  return (
                    <Fragment key={id}>
                      <tr
                        key={id}
                        className={cn(
                          "dt-row",
                          onRowClick && "dt-row--clickable",
                          isExpanded && "dt-row--expanded"
                        )}
                        onClick={() => onRowClick?.(row)}
                        tabIndex={onRowClick ? 0 : undefined}
                        onKeyDown={(e) =>
                          e.key === "Enter" && onRowClick?.(row)
                        }
                        aria-expanded={expandedRow ? isExpanded : undefined}
                      >
                        {expandedRow && (
                          <td
                            className="dt-td dt-td--expand"
                            onClick={(e) => toggleExpand(id, e)}
                          >
                            <span
                              className={`dt-expand-icon${isExpanded ? " dt-expand-icon--open" : ""}`}
                            >
                              {isExpanded ? "▾" : "▸"}
                            </span>
                          </td>
                        )}
                        {shown.map((col) => (
                          <td
                            key={col.key}
                            className={cn(
                              "dt-td",
                              col.pinned && "dt-td--pinned",
                              col.className,
                              col.align === "right" && "dt-td--right"
                            )}
                          >
                            {col.cell(row)}
                          </td>
                        ))}
                      </tr>
                      {expandedRow && isExpanded && (
                        <tr key={`${id}-expanded`} className="dt-row-expansion">
                          <td
                            colSpan={shown.length + 1}
                            className="dt-td dt-td--expansion"
                          >
                            <div className="dt-expansion-content">
                              {expandedRow(row)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
          </tbody>
        </table>
      </div>

      {/* ── Empty state ── */}
      {!isLoading && paged.length === 0 && (
        <EmptyState
          title={query ? "No matching records" : "No records"}
          message={
            query
              ? `No results for "${query}"`
              : "No operational records to display."
          }
        />
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="dt-pagination">
          <span className="dt-pagination__info">
            Page {page} of {totalPages} — {sorted.length} records
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
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return (
                <button
                  type="button"
                  key={p}
                  className={cn(
                    "dt-pagination__btn",
                    page === p && "dt-pagination__btn--active"
                  )}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              );
            })}
            <button
              type="button"
              className="dt-pagination__btn"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              ›
            </button>
            <button
              type="button"
              className="dt-pagination__btn"
              disabled={page === totalPages}
              onClick={() => setPage(totalPages)}
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
