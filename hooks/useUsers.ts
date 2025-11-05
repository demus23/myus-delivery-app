import { useState, useEffect } from "react";

// Change to false when your real API is ready
const USE_MOCK = true;

const mockUsers = [
  { id: 1, name: "Sarah Ahmed", email: "sarah@demo.com", role: "Admin", status: "Active" },
  { id: 2, name: "Mohamed Ali", email: "mo@demo.com", role: "User", status: "Inactive" },
  { id: 3, name: "Bethel Tadesse", email: "bethel@demo.com", role: "User", status: "Active" },
  { id: 4, name: "Natnael Fisehaye", email: "nati@demo.com", role: "Admin", status: "Active" },
  { id: 5, name: "John Smith", email: "john@demo.com", role: "User", status: "Active" },
  // Add more users if you want
];

export function useUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (USE_MOCK) {
      setTimeout(() => {
        setUsers(mockUsers);
        setLoading(false);
      }, 500); // Simulate loading
    } else {
      fetch("/api/users")
        .then(res => res.json())
        .then(data => {
          setUsers(data.users || data);
          setLoading(false);
        });
    }
  }, []);

  return { users, loading, setUsers };
}
