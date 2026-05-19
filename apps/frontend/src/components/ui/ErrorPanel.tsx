import { apiErrorMessage } from "../../api/client";
export function ErrorPanel({ error }: { error: unknown }) {
  return (
    <div className="error-panel">
      <strong>Operation could not be completed.</strong>
      <span>{apiErrorMessage(error)}</span>
    </div>
  );
}
