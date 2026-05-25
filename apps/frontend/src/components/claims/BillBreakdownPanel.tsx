import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { claimsApi, DEPARTMENT_CATEGORIES } from "../../api/services";
import type {
  BillLineItem,
  Claim,
  DepartmentCategory,
} from "../../types/domain";
import { formatCurrency, labelize } from "../../utils/format";
import { Button } from "../ui/Button";
import { ErrorPanel } from "../ui/ErrorPanel";
import { Card, CardHeader } from "../ui/Card";

interface BillBreakdownPanelProps {
  claim: Claim;
}

export function BillBreakdownPanel({ claim }: BillBreakdownPanelProps) {
  const qc = useQueryClient();
  const existingBreakdown = claim.billBreakdown ?? [];
  const hasExisting = existingBreakdown.length > 0;

  const [items, setItems] = useState<BillLineItem[]>(() =>
    hasExisting
      ? existingBreakdown
      : DEPARTMENT_CATEGORIES.map((c) => ({
          departmentCategory: c.value as DepartmentCategory,
          amount: 0,
          description: "",
        }))
  );

  const [isEditing, setIsEditing] = useState(!hasExisting);

  const save = useMutation({
    mutationFn: () =>
      claimsApi.updateBillBreakdown(
        claim.id || claim._id,
        items.filter((i) => i.amount > 0)
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["claim", claim.id || claim._id] });
      setIsEditing(false);
    },
  });

  const total = useMemo(
    () => items.reduce((sum, i) => sum + (i.amount || 0), 0),
    [items]
  );

  const diff = claim.totalClaimAmount - total;
  const isBalanced = Math.abs(diff) < 1;

  const updateItem = (
    idx: number,
    field: keyof BillLineItem,
    value: unknown
  ) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const getCatLabel = (cat: string) =>
    DEPARTMENT_CATEGORIES.find((c) => c.value === cat)?.label ?? labelize(cat);

  // Read-only view
  if (hasExisting && !isEditing) {
    const filledItems = existingBreakdown.filter((i) => i.amount > 0);
    return (
      <Card className="premium-panel">
        <CardHeader
          title="Department-wise bill breakdown"
          eyebrow="Pharmacy · Laboratory · Radiology · Room charges"
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 10,
            padding: "0 0 12px",
          }}
        >
          {filledItems.map((item) => (
            <div
              key={item.departmentCategory}
              style={{
                padding: "10px 14px",
                background:
                  "color-mix(in srgb, var(--accent-primary) 6%, transparent)",
                borderRadius: "var(--r-md)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  marginBottom: 2,
                }}
              >
                {getCatLabel(item.departmentCategory)}
              </div>
              <strong style={{ fontSize: 15 }}>
                {formatCurrency(item.amount)}
              </strong>
              {item.description && (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    marginTop: 2,
                  }}
                >
                  {item.description}
                </div>
              )}
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 0 0",
            borderTop:
              "1px solid color-mix(in srgb, var(--text-tertiary) 15%, transparent)",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Breakdown total: <strong>{formatCurrency(total)}</strong> / Claim
            total: <strong>{formatCurrency(claim.totalClaimAmount)}</strong>
          </span>
          <Button variant="secondary" onClick={() => setIsEditing(true)}>
            Edit Breakdown
          </Button>
        </div>
      </Card>
    );
  }

  // Edit mode
  return (
    <Card className="premium-panel">
      <CardHeader
        title="Department-wise bill breakdown"
        eyebrow="Enter the amount for each department that makes up the total claim"
      />
      <div style={{ display: "grid", gap: 6 }}>
        {items.map((item, idx) => (
          <div
            key={item.departmentCategory}
            style={{
              display: "grid",
              gridTemplateColumns: "170px 140px 1fr",
              gap: 8,
              alignItems: "center",
              padding: "6px 10px",
              background:
                item.amount > 0
                  ? "color-mix(in srgb, var(--accent-primary) 4%, transparent)"
                  : "transparent",
              borderRadius: "var(--r-md)",
              fontSize: 13,
            }}
          >
            <strong>{getCatLabel(item.departmentCategory)}</strong>
            <input
              className="input"
              type="number"
              min={0}
              step="0.01"
              value={item.amount || ""}
              onChange={(e) =>
                updateItem(idx, "amount", Number(e.target.value))
              }
              placeholder="₹ 0"
              style={{ fontSize: 13, padding: "6px 10px" }}
            />
            <input
              className="input"
              type="text"
              value={item.description ?? ""}
              onChange={(e) => updateItem(idx, "description", e.target.value)}
              placeholder="Description (optional)"
              style={{ fontSize: 12, padding: "6px 10px" }}
            />
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 0 0",
          marginTop: 12,
          borderTop:
            "1px solid color-mix(in srgb, var(--text-tertiary) 15%, transparent)",
        }}
      >
        <div style={{ fontSize: 13 }}>
          <span style={{ color: "var(--text-secondary)" }}>
            Total: <strong>{formatCurrency(total)}</strong>
          </span>
          {!isBalanced && (
            <span
              style={{
                color: "var(--amber)",
                fontWeight: 600,
                marginLeft: 12,
                fontSize: 12,
              }}
            >
              ⚠{" "}
              {diff > 0
                ? `₹${diff.toFixed(2)} unallocated`
                : `₹${Math.abs(diff).toFixed(2)} over-allocated`}
            </span>
          )}
          {isBalanced && total > 0 && (
            <span
              style={{
                color: "var(--green)",
                fontWeight: 600,
                marginLeft: 12,
                fontSize: 12,
              }}
            >
              ✓ Balanced with claim total
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {hasExisting && (
            <Button variant="ghost" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          )}
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || total === 0}
          >
            {save.isPending ? "Saving…" : "Save Breakdown"}
          </Button>
        </div>
      </div>
      {save.isError && <ErrorPanel error={save.error} />}
    </Card>
  );
}
