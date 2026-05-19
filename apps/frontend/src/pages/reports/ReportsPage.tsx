import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportApi } from "../../api/services";
import { Card, CardHeader } from "../../components/ui/Card";
import { ErrorPanel } from "../../components/ui/ErrorPanel";
import { formatCurrency, labelize } from "../../utils/format";
export function ReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [patientId, setPatientId] = useState("");
  const monthly = useQuery({
    queryKey: ["reports", "monthly", year, month],
    queryFn: () => reportApi.monthly(year, month),
  });
  const insurance = useQuery({
    queryKey: ["reports", "insurance"],
    queryFn: reportApi.insurancePerformance,
  });
  const patient = useQuery({
    queryKey: ["reports", "patient", patientId],
    enabled: patientId.length > 0,
    queryFn: () => reportApi.patientClaims(patientId),
  });
  return (
    <div className="page-stack">
      <div className="page-title">
        <p className="eyebrow">Audit-ready reporting</p>
        <h1>Reports & PDF Preview</h1>
        <span>
          Formal hospital branding, printable layouts, watermark support and
          signature sections.
        </span>
      </div>
      <section className="filter-bar">
        <input
          className="input"
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        />
        <input
          className="input"
          type="number"
          min={1}
          max={12}
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
        />
        <input
          className="input"
          placeholder="Patient ID for summary"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
        />
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => window.print()}
        >
          Export PDF / Print
        </button>
      </section>
      {monthly.isError && <ErrorPanel error={monthly.error} />}
      <div className="report-preview">
        <div className="report-watermark">Malavia Hospital Confidential</div>
        <header>
          <div>
            <p>Malavia Hospital Confidential</p>
            <h2>Insurance Claims Financial Review</h2>
            <span>
              Period {month}/{year}
            </span>
          </div>
          <div className="report-meta">
            Page 1 · Generated {new Date().toLocaleString()}
          </div>
        </header>
        <section className="report-summary">
          {monthly.data?.map((row) => (
            <div key={row._id ?? row.status}>
              <span>{labelize(row._id ?? row.status)}</span>
              <strong>{row.count ?? 0}</strong>
              <em>{formatCurrency(row.totalAmount)}</em>
            </div>
          ))}
        </section>
        <table className="report-table">
          <thead>
            <tr>
              <th>Insurance company</th>
              <th>Total claims</th>
              <th>Claim amount</th>
              <th>Settled</th>
              <th>Settlement ratio</th>
            </tr>
          </thead>
          <tbody>
            {insurance.data?.map((row) => (
              <tr key={row.companyName}>
                <td>{row.companyName}</td>
                <td>{row.totalClaims}</td>
                <td>{formatCurrency(row.totalClaimAmount)}</td>
                <td>{row.settledClaims}</td>
                <td>{Math.round(row.settlementRatio ?? 0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {patient.data && (
          <Card>
            <CardHeader title="Patient claim summary" eyebrow={patientId} />
            {patient.data.map((row) => (
              <div className="alert-row" key={row._id ?? row.status}>
                <span>{labelize(row._id ?? row.status)}</span>
                <strong>
                  {row.count} · {formatCurrency(row.totalAmount)}
                </strong>
              </div>
            ))}
          </Card>
        )}
        <footer>
          <span>
            Prepared for administration, insurers, auditors and financial
            review.
          </span>
          <span>Authorized signature: __________________</span>
        </footer>
      </div>
    </div>
  );
}
