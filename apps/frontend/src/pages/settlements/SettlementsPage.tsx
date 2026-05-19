import { Link } from "react-router-dom";
import { Card, CardHeader } from "../../components/ui/Card";
export function SettlementsPage() {
  return (
    <div className="page-stack">
      <div className="page-title">
        <p className="eyebrow">Finance operations</p>
        <h1>Settlements</h1>
        <span>
          Open a claim cockpit to finalize settlements, validate deductions, TDS
          and department allocations.
        </span>
      </div>
      <Card>
        <CardHeader
          title="Settlement workflow"
          eyebrow="Controlled from claim cockpit"
        />
        <p>
          Settlement creation is intentionally claim-centered to preserve audit
          context and prevent orphan financial entries.
        </p>
        <Link
          className="btn btn-primary"
          to="/claims?status=SETTLEMENT_PENDING"
        >
          Open settlement pending claims
        </Link>
      </Card>
    </div>
  );
}
