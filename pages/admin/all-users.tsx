// pages/admin/all-users.tsx
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function AllUsersPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.role === "admin") {
      fetch("/api/admin/all-users")
        .then((res) => res.json())
        .then((data) => {
          setUsers(data);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [session]);

  if (status === "loading" || loading) return <div>Loading...</div>;
  if (!session || session.user?.role !== "admin") return <div>Unauthorized</div>;

  return (
    <div>
      <h1>All Users</h1>
      <ul>
        {users.map((user: any) => (
          <li key={user._id}>
            {user.name} – {user.email} – {user.role}
          </li>
        ))}
      </ul>
    </div>
  );
}
