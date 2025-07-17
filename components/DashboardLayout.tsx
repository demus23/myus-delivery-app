// components/DashboardLayout.tsx
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg flex flex-col py-6 px-4">
        <h2 className="text-2xl font-bold mb-8">GulfShip</h2>
        <nav className="flex flex-col gap-3">
          <Link className="hover:bg-gray-200 rounded-lg px-3 py-2" href="/dashboard">Dashboard</Link>
          <Link className="hover:bg-gray-200 rounded-lg px-3 py-2" href="/mypackages">My Packages</Link>
          {session?.user?.role === "admin" && (
            <Link className="hover:bg-gray-200 rounded-lg px-3 py-2 font-semibold text-blue-700" href="/admin">
              Admin Panel
              <Link className="hover:bg-gray-200 rounded-lg px-3 py-2" href="/admin/users">Users</Link>

            </Link>
          )}
        </nav>
        <div className="mt-auto">
          <button
            className="bg-red-100 text-red-600 rounded-lg px-3 py-2 w-full hover:bg-red-200 mt-10"
            onClick={() => signOut()}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 p-8">
        {/* Topbar */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-xl font-semibold">Welcome, {session?.user?.name ?? session?.user?.email}</h1>
            <span className="text-sm text-gray-500">Role: {session?.user?.role}</span>
          </div>
          <div>
            {/* Placeholder for notifications, avatar, etc. */}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
