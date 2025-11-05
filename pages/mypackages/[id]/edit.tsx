import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function EditPackage() {
  const router = useRouter();
  const { id } = router.query;
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) {
      fetch(`/api/mypackages/${id}`)
        .then(res => res.json())
        .then(data => {
          setForm(data);
          setLoading(false);
        });
    }
  }, [id]);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`/api/mypackages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg);
      }
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to update package");
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!form) return <div>Package not found.</div>;

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">Edit Package</h1>
      <input name="title" value={form.title || ""} onChange={handleChange} placeholder="Title" className="w-full border rounded-xl px-4 py-2" />
      <input name="recipient" value={form.recipient || ""} onChange={handleChange} placeholder="Recipient" className="w-full border rounded-xl px-4 py-2" />
      <input name="suiteId" value={form.suiteId || ""} onChange={handleChange} placeholder="Suite ID" className="w-full border rounded-xl px-4 py-2" />
      <input name="courier" value={form.courier || ""} onChange={handleChange} placeholder="Courier" className="w-full border rounded-xl px-4 py-2" />
      <input name="tracking" value={form.tracking || ""} onChange={handleChange} placeholder="Tracking" className="w-full border rounded-xl px-4 py-2" />
      <input name="value" type="number" value={form.value || ""} onChange={handleChange} placeholder="Value" className="w-full border rounded-xl px-4 py-2" />
      <textarea name="description" value={form.description || ""} onChange={handleChange} placeholder="Description" className="w-full border rounded-xl px-4 py-2" />
      <input name="address" value={form.address || ""} onChange={handleChange} placeholder="Address" className="w-full border rounded-xl px-4 py-2" />
      {/* Status: only allow edit if you want */}
      <input name="status" value={form.status || ""} onChange={handleChange} placeholder="Status" className="w-full border rounded-xl px-4 py-2" />
      {error && <div className="text-red-500">{error}</div>}
      <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-xl">Save</button>
      <button type="button" onClick={() => router.back()} className="ml-2 px-4 py-2 border rounded-xl">Cancel</button>
    </form>
  );
}
