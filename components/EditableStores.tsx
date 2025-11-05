// components/EditableStores.tsx
import React, { useMemo, useState } from "react";
import type { IStore } from "@/lib/models/User";

type StoreUI = IStore & {
  // Optional UI-only fields
  logo?: string;
  url?: string;      // UI may send 'url'; server uses 'domain'
  domain?: string;   // ✅ add this so TS knows about 'domain'
  _id?: string;      // some APIs return Mongo-style _id
  id?: string;       // others may return id
};

type Props = {
  userId: string;
  initialStores?: StoreUI[];
  onChange?: (stores: StoreUI[]) => void;
};

const cardStyle: React.CSSProperties = {
  borderRadius: 16,
  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  background: "#fff",
  padding: "16px",
  minWidth: 320,
  maxWidth: 560,
  margin: "16px auto",
  position: "relative",
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "10px 12px",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
};

// Prefer id/_id when present; otherwise a stable fallback
function storeIdOf(s: StoreUI): string | undefined {
  return s._id ?? s.id;
}

export default function EditableStores({
  userId,
  initialStores = [],
  onChange,
}: Props) {
  const [stores, setStores] = useState<StoreUI[]>(initialStores);
  const [name, setName] = useState<string>("");
  const [domainOrUrl, setDomainOrUrl] = useState<string>("");

  const disabled = useMemo(
    () => !name.trim() || !domainOrUrl.trim(),
    [name, domainOrUrl]
  );

  async function addStore() {
    const payload = {
      name: name.trim(),
      // backend accepts either 'domain' or 'url' (we normalize to domain)
      domain: domainOrUrl.trim(),
    };

    const res = await fetch(
      `/api/user/stores?userId=${encodeURIComponent(userId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const msg = (await res.json().catch(() => ({}))) as {
        message?: string;
      };
      throw new Error(msg?.message || "Failed to add store");
    }

    const next = (await res.json()) as StoreUI[];
    setStores(next);
    onChange?.(next);
    setName("");
    setDomainOrUrl("");
  }

  async function removeStore(storeId: string) {
    const res = await fetch(
      `/api/user/stores?userId=${encodeURIComponent(
        userId
      )}&storeId=${encodeURIComponent(storeId)}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const msg = (await res.json().catch(() => ({}))) as {
        message?: string;
      };
      throw new Error(msg?.message || "Failed to delete store");
    }
    const next = (await res.json()) as StoreUI[];
    setStores(next);
    onChange?.(next);
  }

  return (
    <div style={cardStyle}>
      <h3 style={{ margin: 0, marginBottom: 12 }}>Your Stores</h3>

      {/* Add row */}
      <div style={{ ...rowStyle, marginBottom: 12 }}>
        <input
          style={inputStyle}
          placeholder="Store name (e.g., Nike)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          style={inputStyle}
          placeholder="Domain or URL (e.g., nike.com)"
          value={domainOrUrl}
          onChange={(e) => setDomainOrUrl(e.target.value)}
        />
        <button
          style={{
            ...buttonStyle,
            background: disabled ? "#d1d5db" : "#0ea5e9",
            color: "#fff",
          }}
          disabled={disabled}
          onClick={() => void addStore()}
        >
          Add
        </button>
      </div>

      {/* List */}
      <div style={{ display: "grid", gap: 10 }}>
        {stores.map((s) => {
          const sid = storeIdOf(s);
          const key = sid ?? `${s.name}-${(s.domain ?? s.url ?? "")}`;
          const showDomain = s.domain ?? s.url ?? "";

          return (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 10,
              }}
            >
              {/* Optional logo */}
              {s.logo ? (
                <img
                  src={s.logo}
                  alt={s.name ?? "Store"}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  aria-hidden
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "#f3f4f6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                  }}
                >
                  🏬
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>
                  {s.name ?? "Unnamed store"}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {showDomain}
                </div>
              </div>

              {sid && (
                <button
                  style={{ ...buttonStyle, background: "#ef4444", color: "#fff" }}
                  onClick={() => void removeStore(sid)}
                >
                  Remove
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
