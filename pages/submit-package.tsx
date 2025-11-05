import { useState } from "react";
import { useRouter } from "next/router";

export default function SubmitPackage() {
  const router = useRouter();
  const [form, setForm] = useState({
    tracking: "",
    courier: "",
    value: "",
    status: "",
    title: "",
    recipient: "",
    description: "",
    suiteId: "",
    address: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to submit package.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-green-50 via-white to-green-100 flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 space-y-4"
      >
        <h1 className="text-2xl font-bold mb-4">Submit New Package</h1>
        <input name="title" value={form.title} onChange={handleChange} placeholder="Title" className="w-full border rounded-xl px-4 py-2" />
        <input name="recipient" value={form.recipient} onChange={handleChange} placeholder="Recipient Name" className="w-full border rounded-xl px-4 py-2" />
        <input name="suiteId" value={form.suiteId} onChange={handleChange} placeholder="Suite ID" className="w-full border rounded-xl px-4 py-2" />
        <input name="courier" value={form.courier} onChange={handleChange} placeholder="Courier (e.g. DHL, UPS)" className="w-full border rounded-xl px-4 py-2" />
        <input name="tracking" value={form.tracking} onChange={handleChange} placeholder="Tracking Number" className="w-full border rounded-xl px-4 py-2" />
        <input name="value" type="number" value={form.value} onChange={handleChange} placeholder="Declared Value" className="w-full border rounded-xl px-4 py-2" />
        <input name="status" value={form.status} onChange={handleChange} placeholder="Status (default: Pending)" className="w-full border rounded-xl px-4 py-2" />
        <input name="address" value={form.address} onChange={handleChange} placeholder="Delivery Address" className="w-full border rounded-xl px-4 py-2" />
        <textarea name="description" value={form.description} onChange={handleChange} placeholder="Package Description" className="w-full border rounded-xl px-4 py-2" />
        {error && <div className="text-red-500">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-2 font-semibold"
        >
          {loading ? "Submitting..." : "Submit Package"}
        </button>
      </form>
    </div>
  );
}
