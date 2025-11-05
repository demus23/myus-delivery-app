// components/DocumentUploader.tsx
import React, { useState } from "react";

export type DocFile = {
  label: string;
  filename: string;
  url?: string;
  uploadedAt?: string | Date;
};

type Props = {
  list: DocFile[];
  uploadUrl: string;                 // e.g. /api/admin/users/:id/documents  OR  /api/user/documents
  onChange: (next: DocFile[]) => void;
  title?: string;
};

export default function DocumentUploader({ list, uploadUrl, onChange, title }: Props) {
  const [label, setLabel] = useState("");
  const [selected, setSelected] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0] || null;
    setSelected(file);
  };

  const upload = async () => {
    setMsg(null);
    if (!selected) {
      setMsg({ type: "err", text: "Please choose a file." });
      return;
    }

    const fd = new FormData();
    fd.append("label", label || "Document");
    fd.append("file", selected);

    try {
      setBusy(true);
      const res = await fetch(uploadUrl, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");

      onChange((data.documents || []) as DocFile[]);
      setLabel("");
      setSelected(null);
      setMsg({ type: "ok", text: "Uploaded!" });
    } catch (e: unknown) {
  const text =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Upload failed";
  setMsg({ type: "err", text });
}
 finally {
      setBusy(false);
    }
  };

  const remove = async (filename: string) => {
    if (!confirm("Delete this document?")) return;
    setMsg(null);
    try {
      setBusy(true);
      const url = `${uploadUrl}?filename=${encodeURIComponent(filename)}`;
      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete failed");

      onChange((data.documents || []) as DocFile[]);
      setMsg({ type: "ok", text: "Deleted." });
    } catch (e: unknown) {
  const text =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Delete failed";
  setMsg({ type: "err", text });
}
 finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {title && <h6 className="mb-2">{title}</h6>}

      <div className="d-flex gap-2 mb-2">
        <input
          className="form-control"
          placeholder="Label (Passport, Invoice...)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <input type="file" className="form-control" onChange={onPick} />
        <button className="btn btn-primary" onClick={upload} disabled={busy}>
          {busy ? "Uploading..." : "Upload"}
        </button>
      </div>

      {msg && (
        <div className={`alert ${msg.type === "ok" ? "alert-success" : "alert-danger"} py-2`} role="status">
          {msg.text}
        </div>
      )}

      {list?.length ? (
        <ul className="list-group">
          {list.map((d, i) => (
            <li key={`${d.filename}-${i}`} className="list-group-item d-flex justify-content-between align-items-center">
              <span className="me-2">
                <strong>{d.label}</strong> — {d.filename}
                {d.uploadedAt ? (
                  <span className="text-muted ms-2">
                    {new Date(d.uploadedAt as any).toLocaleString()}
                  </span>
                ) : null}
              </span>
              <span className="d-flex gap-2">
                {d.url && (
                  <a className="btn btn-outline-secondary btn-sm" href={d.url} target="_blank" rel="noreferrer">
                    View
                  </a>
                )}
                <button className="btn btn-outline-danger btn-sm" onClick={() => remove(d.filename)} disabled={busy}>
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-muted">No documents yet.</div>
      )}
    </div>
  );
}
