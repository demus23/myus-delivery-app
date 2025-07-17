// lib/api.ts
export type Package = {
  id: number;
  suiteId: string;
  title: string;
  tracking: string;
  courier: string;
  status: string;
  value: string;
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
export async function addPackage(pkg: Omit<Package, "id" | "createdAt">, token: string): Promise<Package> {
  const res = await fetch("/api/admin/packages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(pkg)
  });
  if (!res.ok) throw new Error("Failed to add package");
  return res.json();
}

// Update a package (PUT)
export async function updatePackage(id: number, pkg: Omit<Package, "id" | "createdAt">, token: string): Promise<Package> {
  const res = await fetch(`/api/admin/packages/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(pkg)
  });
  if (!res.ok) throw new Error("Failed to update package");
  return res.json();
}

// Delete a package (DELETE)
export async function deletePackage(id: number, token: string): Promise<{ message: string }> {
  const res = await fetch(`/api/admin/packages/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to delete package");
  return res.json();
}
