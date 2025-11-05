import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function PackageView() {
  const router = useRouter();
  const { id } = router.query;
  const [pkg, setPkg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) {
      fetch(`/api/mypackages/${id}`)
        .then(res => res.json())
        .then(data => {
          if (data.error) setError(data.error);
          else setPkg(data);
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!pkg) return <div>No package found.</div>;

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Package Details</h1>
      <ul>
        <li><b>Tracking:</b> {pkg.tracking}</li>
        <li><b>Courier:</b> {pkg.courier}</li>
        <li><b>Status:</b> {pkg.status}</li>
        <li><b>Value:</b> {pkg.value}</li>
        <li><b>Title:</b> {pkg.title}</li>
        <li><b>Recipient:</b> {pkg.recipient}</li>
        <li><b>Suite ID:</b> {pkg.suiteId}</li>
        <li><b>Address:</b> {pkg.address}</li>
        <li><b>Description:</b> {pkg.description}</li>
        <li><b>Created At:</b> {pkg.createdAt}</li>
      </ul>
      <button className="mt-4 border rounded px-4 py-2" onClick={() => router.back()}>Back</button>
    </div>
  );
}
