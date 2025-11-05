// lib/api.ts
import axios from "axios";

// ---------- AXIOS INSTANCE ----------
export const api = axios.create({
  baseURL: "/api",
  timeout: 15000,
});

// Normalize accidental `/api/...` when baseURL already ends with /api,
// and collapse duplicate slashes.
api.interceptors.request.use((config) => {
  if (typeof config.url === "string") {
    // strip leading whitespace
    let u = config.url.trim();

    // remove leading slashes so `baseURL:/api` + `url:admin/...` => /api/admin/...
    if (u.startsWith("/")) u = u.replace(/^\/+/, "/");

    // if caller passed "/api/..." and baseURL already ends with "/api",
    // drop the extra prefix -> "admin/..."
    if (config.baseURL?.endsWith("/api") && u.startsWith("/api/")) {
      u = u.replace(/^\/api\//, "");
    }

    // ensure no accidental double slashes
    u = u.replace(/\/{2,}/g, "/");

    config.url = u;
  }
  return config;
});

export default api;

// Safe error helper (works across axios versions)
export function getAxiosErrorMessage(err: unknown): string {
  const e = err as any;
  const apiMessage =
    e?.response?.data?.message ??
    e?.response?.data?.error ??
    e?.response?.message;
  if (typeof apiMessage === "string" && apiMessage.length > 0) return apiMessage;
  if (typeof e?.message === "string" && e.message.length > 0) return e.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

// ---------- EXISTING FETCH PACKAGE FUNCTIONS ----------
export type Package = {
  id: string;          // was number; most APIs use string/ObjectId
  suiteId: string;
  title: string;
  tracking: string;
  courier: string;
  status: string;
  value: number;       // was string; treat as number
  createdAt: string;
};

// Fetch all packages (GET)
export async function fetchPackages(token: string): Promise<Package[]> {
  const res = await fetch("/api/admin/packages", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch packages");
  return res.json();
}

// Add a new package (POST)
export async function addPackage(
  pkg: Omit<Package, "id" | "createdAt">,
  token: string
): Promise<Package> {
  const res = await fetch("/api/admin/packages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(pkg),
  });
  if (!res.ok) throw new Error("Failed to add package");
  return res.json();
}

// Update a package (PUT)
export async function updatePackage(
  id: string,
  pkg: Omit<Package, "id" | "createdAt">,
  token: string
): Promise<Package> {
  const res = await fetch(`/api/admin/packages/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(pkg),
  });
  if (!res.ok) throw new Error("Failed to update package");
  return res.json();
}

// Delete a package (DELETE)
export async function deletePackage(
  id: string,
  token: string
): Promise<{ message: string }> {
  const res = await fetch(`/api/admin/packages/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to delete package");
  return res.json();
}
