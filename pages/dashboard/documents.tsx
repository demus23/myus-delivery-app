// pages/dashboard/documents.tsx
import { useEffect, useState } from "react";
import DocumentUploader, { DocFile } from "@/components/DocumentUploader";

type Doc = DocFile; // keep the same shape as the uploader

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);

  // Load existing documents on mount (optional)
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/user/documents");
      if (res.ok) {
        const data = await res.json();
        setDocs((data.documents || []) as Doc[]);
      }
    })();
  }, []);

  // Adapter matches uploader prop type exactly
  const handleDocsChange = (next: DocFile[]) => setDocs(next as Doc[]);

  return (
    <div className="container py-4">
      <h3 className="mb-3">My Documents</h3>
      <DocumentUploader
        list={docs}
        uploadUrl="/api/user/documents"
        onChange={handleDocsChange}
      />
    </div>
  );
}
