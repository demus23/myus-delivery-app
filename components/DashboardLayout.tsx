// components/DashboardLayout.tsx

import { ReactNode } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopbar } from "./DashboardTopbar";

// Define a User type if needed
type User = { name?: string };

// Define the props type for the layout
interface DashboardLayoutProps {
  children: ReactNode;
  user?: User;
  active?: string;
}

export default function DashboardLayout({
  children,
  user,
  active,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen flex bg-neutral-50">
      <DashboardSidebar active={active} />
      <div className="flex flex-col flex-1">
        <DashboardTopbar user={user} />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
