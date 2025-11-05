// components/AddressManager.tsx
import React from "react";

type Address = {
  label: string;
  address: string;
  city?: string;
  country?: string;
  postalCode?: string;
};

type Props = {
  userId: string;                       // required
  addresses: Address[];                 // parent provides current list
  onChanged?: (next: Address[]) => void; // optional: parent refresh callback
  admin?: boolean;                      // true => /api/admin/users/:id/addresses
};

export default function AddressManager({
  userId,
  addresses,
  onChanged,
  admin = true,
}: Props) {
  const base = admin
    ? `/api/admin/users/${userId}/addresses`
    : `/api/user/addresses`;

  const [items, setItems] = React.useState<Address[]>(addresses || []);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [form, setForm] = React.useState<Address>({
    label: "",
    address: "",
    city: "",
    country: "",
    postalCode: "",
  });
  const [saving, setSaving] = React.useState(false);
  const [toast, setToast] = React.useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  // keep internal list in sync with parent updates
  React.useEffect(() => {
    setItems(addresses || []);
  }, [addresses]);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    window.setTimeout(() => setToast(null), 2000);
  }

  function openCreate() {
    setEditingIndex(null);
    setForm({ label: "", address: "", city: "", country: "", postalCode: "" });
    setDrawerOpen(true);
  }

  function openEdit(i: number) {
    setEditingIndex(i);
    setForm(items[i]);
    setDrawerOpen(true);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label.trim() || !form.address.trim()) {
      showToast("Label and Address are required.", "error");
      return;
    }

    setSaving(true);
    try {
      const method = editingIndex === null ? "POST" : "PUT";
      const body =
        editingIndex === null ? form : { index: editingIndex, ...form };

      const r = await fetch(base, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "same-origin", // include NextAuth cookie
        cache: "no-store",
      });
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok || j.ok === false) {
         
        console.error("[AddressManager] save failed", r.status, j);
        throw new Error(j.error || `Save failed (${r.status})`);
      }

      const next = (j.addresses || j.data || []) as Address[];
      setItems(next);
      onChanged?.(next); // let parent refresh user
      setDrawerOpen(false);
      showToast(editingIndex === null ? "Address added" : "Address updated");
    } catch (err: any) {
      showToast(err.message || "Error", "error");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(i: number) {
    if (!confirm("Delete this address?")) return;
    try {
      const r = await fetch(base, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index: i }),
        credentials: "same-origin",
        cache: "no-store",
      });
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok || j.ok === false) {
         
        console.error("[AddressManager] delete failed", r.status, j);
        throw new Error(j.error || `Delete failed (${r.status})`);
      }
      const next = (j.addresses || j.data || []) as Address[];
      setItems(next);
      onChanged?.(next);
      showToast("Address deleted");
    } catch (err: any) {
      showToast(err.message || "Error", "error");
    }
  }

  if (!userId) {
    return (
      <div className="text-sm text-red-600">
        Missing userId for AddressManager.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[70] rounded-xl px-4 py-2 shadow-lg text-white ${
            toast.type === "success" ? "bg-black" : "bg-red-600"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-semibold">Address Book</h3>
        <button
          onClick={openCreate}
          className="px-3 py-2 rounded-xl bg-black text-white hover:opacity-90"
        >
          Add Address
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-gray-500">No addresses yet.</div>
      ) : (
        <ul className="divide-y rounded-xl border overflow-hidden bg-white">
          {items.map((a, i) => (
            <li
              key={i}
              className="p-4 flex items-start justify-between gap-3 hover:bg-gray-50"
            >
              <div>
                <div className="font-medium">{a.label}</div>
                <div className="text-sm text-gray-600">
                  {a.address}
                  {a.city ? `, ${a.city}` : ""}
                  {a.postalCode ? `, ${a.postalCode}` : ""}
                  {a.country ? `, ${a.country}` : ""}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(i)}
                  className="text-sm px-3 py-1 rounded-lg border hover:bg-gray-100"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(i)}
                  className="text-sm px-3 py-1 rounded-lg border text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Slide-over Drawer */}
      <div
        className={`fixed inset-0 z-50 pointer-events-none ${
          drawerOpen ? "" : "invisible"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
            drawerOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => !saving && setDrawerOpen(false)}
        />
        {/* Panel */}
        <div
          className={`
            absolute inset-y-0 right-0 w-full sm:w-[520px] max-w-full bg-white shadow-2xl
            transition-transform duration-300 pointer-events-auto
            ${drawerOpen ? "translate-x-0" : "translate-x-full"}
            flex flex-col
          `}
        >
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div className="text-base font-semibold">
              {editingIndex === null ? "Add Address" : "Edit Address"}
            </div>
            <button
              className="rounded-lg px-2 py-1 text-gray-600 hover:bg-gray-100"
              onClick={() => !saving && setDrawerOpen(false)}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <form onSubmit={onSave} className="p-5 grid gap-4 flex-1 overflow-auto">
            <div>
              <label className="block text-sm font-medium mb-1">Label *</label>
              <input
                className="w-full border rounded-lg p-2"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="e.g. Home, Office"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Address *</label>
              <textarea
                className="w-full border rounded-lg p-2"
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Street & house number"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">City</label>
                <input
                  className="w-full border rounded-lg p-2"
                  value={form.city || ""}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Postal code
                </label>
                <input
                  className="w-full border rounded-lg p-2"
                  value={form.postalCode || ""}
                  onChange={(e) =>
                    setForm({ ...form, postalCode: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Country</label>
                <input
                  className="w-full border rounded-lg p-2"
                  value={form.country || ""}
                  onChange={(e) =>
                    setForm({ ...form, country: e.target.value })
                  }
                  placeholder="Country"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="px-3 py-2 rounded-xl border"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-60"
              >
                {saving
                  ? "Saving…"
                  : editingIndex === null
                  ? "Add Address"
                  : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
