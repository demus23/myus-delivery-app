// pages/documents.tsx
import dynamic from "next/dynamic";
const DocumentManager = dynamic(() => import("@/components/DocumentManager"), { ssr: false });

export default function DocumentsPage() {
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">My Documents</h1>
      <p className="text-sm text-gray-600 mb-6">Upload IDs, invoices, or any shipping-related files. Max 10MB per file.</p>
      <DocumentManager />
    </main>
  );
}
