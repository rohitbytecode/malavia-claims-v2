import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { documentApi, documentTypes } from "../../api/services";
import { useAuthStore } from "../../store/auth.store";
import type { DocumentType } from "../../types/domain";
import { formatDateTime } from "../../utils/format";
import { Button } from "../ui/Button";
import { ErrorPanel } from "../ui/ErrorPanel";
import { StatusBadge } from "../ui/StatusBadge";
const maxSize = 10 * 1024 * 1024;
const allowed = ["application/pdf", "image/jpeg", "image/png"];
export function DocumentManager({
  claimId,
  locked = false,
}: {
  claimId: string;
  locked?: boolean;
}) {
  const [documentType, setDocumentType] = useState<DocumentType>("PREAUTH");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const docs = useQuery({
    queryKey: ["documents", claimId],
    queryFn: () => documentApi.list(claimId),
  });
  const upload = useMutation({
    mutationFn: documentApi.upload,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents", claimId] });
      setRemarks("");
    },
  });
  function submit(file?: File) {
    setError("");
    if (locked) {
      setError("Closed claims are read-only; document uploads are disabled.");
      return;
    }
    if (!file) return;
    if (!allowed.includes(file.type)) {
      setError("Only PDF, JPG and PNG documents are accepted.");
      return;
    }
    if (file.size > maxSize) {
      setError("Maximum document size is 10 MB.");
      return;
    }
    const duplicate = docs.data?.some(
      (doc) =>
        doc.documentType === documentType && doc.originalName === file.name
    );
    if (duplicate) {
      setError("Duplicate document detected for this claim and category.");
      return;
    }
    const data = new FormData();
    data.append("file", file);
    data.append("claimId", claimId);
    data.append("documentType", documentType);
    data.append("remarks", remarks);
    if (user?._id) data.append("uploadedBy", user._id);
    upload.mutate(data);
  }
  return (
    <div className="documents">
      <div
        className="dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          submit(e.dataTransfer.files[0]);
        }}
      >
        <strong>Drag/drop secure document</strong>
        <span>PDF/JPG/PNG · 10 MB limit · version history retained</span>
        <select
          className="input"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value as DocumentType)}
        >
          {documentTypes.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
        <textarea
          className="input textarea"
          placeholder="Upload remarks"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
        <input
          ref={input}
          hidden
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => submit(e.target.files?.[0])}
        />
        <Button
          type="button"
          disabled={locked || upload.isPending}
          onClick={() => input.current?.click()}
        >
          {locked
            ? "Uploads locked"
            : upload.isPending
              ? "Uploading..."
              : "Choose file"}
        </Button>
        {error && <small className="field-error">{error}</small>}
        {upload.isError && <ErrorPanel error={upload.error} />}
      </div>
      <div className="document-list">
        {docs.data?.map((doc) => (
          <div className="document-row" key={doc._id}>
            <StatusBadge value={doc.documentType} compact />
            <div>
              <strong>{doc.originalName}</strong>
              <span>
                v{doc.version} · {doc.mimeType} ·{" "}
                {formatDateTime(doc.createdAt)}
              </span>
              <small>{doc.remarks}</small>
            </div>
            <button className="link-button" type="button">
              Preview
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
