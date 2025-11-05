// components/DashboardSidebar.tsx
import { Home, Package, Users, BarChart2, LogOut } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function DashboardSidebar({ active = "dashboard" }) {
  const nav = [
    { label: "Dashboard", icon: <Home />, href: "/dashboard", key: "dashboard" },
    { label: "Packages", icon: <Package />, href: "/admin/packages", key: "packages" },
    { label: "Users", icon: <Users />, href: "/admin/users", key: "users" },
    { label: "Analytics", icon: <BarChart2 />, href: "/admin/analytics", key: "analytics" },
  ];
  return (
    <aside className="h-full w-56 bg-white border-r px-4 py-6 flex flex-col gap-2">
      <div className="mb-6 flex items-center font-bold text-xl tracking-wide">
        <span className="text-primary mr-2">MyUS</span> Admin
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {nav.map((item) => (
          <Link key={item.key} href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md hover:bg-neutral-100 transition",
              active === item.key && "bg-neutral-200 font-semibold"
            )}>
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <button className="flex items-center gap-3 px-3 py-2 rounded-md mt-auto hover:bg-neutral-100 transition text-red-500">
        <LogOut size={18} /> Sign Out
      </button>
    </aside>
  );
}
