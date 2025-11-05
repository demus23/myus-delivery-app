// components/DocumentManager.tsx
import React from "react";

type Doc = {
  _id: string;
  label: string;
  url: string;
  filename: string;
  mime: string;
  size: number;
  createdAt: string;
};

export default function DocumentManager() {
  const [docs, setDocs] = React.useState<Doc[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [label, setLabel] = React.useState("");

  async function refresh() {
    const r = await fetch("/api/user/documents");
    const j = await r.json();
    if (j.ok) setDocs(j.data);
  }
  React.useEffect(() => { refresh(); }, []);

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    if (!fileInput.files?.[0]) return;

    const fd = new FormData();
    fd.append("file", fileInput.files[0]);
    if (label) fd.append("label", label);

    setLoading(true);
    try {
      const r = await fetch("/api/user/documents", { method: "POST", body: fd });
      const j = await r.json();
     if (j.ok) {
  setLabel("");
  form.reset();
  await refresh();
}

      else alert(j.error || "Upload failed");
    } finally { setLoading(false); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this document?")) return;
    const r = await fetch(`/api/user/documents?id=${id}`, { method: "DELETE" });
    const j = await r.json();
    if (j.ok) setDocs(docs.filter(d => d._id !== id));
    else alert(j.error || "Delete failed");
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onUpload} className="grid gap-3 md:grid-cols-[1fr_auto_auto] items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Label (optional)</label>
          <input value={label} onChange={e=>setLabel(e.target.value)} className="w-full border rounded-lg p-2" placeholder="Passport, Invoice…" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">File</label>
          <input name="file" type="file" className="block" />
        </div>
        <button
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-60"
        >
          {loading ? "Uploading…" : "Upload"}
        </button>
      </form>

      <div className="grid gap-3">
        {docs.length === 0 && <p className="text-sm text-gray-500">No documents yet.</p>}
        {docs.map(d => (
          <div key={d._id} className="flex items-center justify-between border rounded-xl p-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden border bg-white">
                {d.mime.startsWith("image/") ? (
                   
                  <img src={d.url} alt={d.label} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs">{d.mime.split("/")[1]?.toUpperCase() || "FILE"}</div>
                )}
              </div>
              <div>
                <div className="font-medium">{d.label || "Document"}</div>
                <div className="text-xs text-gray-500">{d.filename} • {(d.size/1024).toFixed(1)} KB</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a className="text-sm underline" href={d.url} target="_blank" rel="noreferrer">View</a>
              <button onClick={()=>remove(d._id)} className="text-sm text-red-600">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
