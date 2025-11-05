// components/DashboardTopbar.tsx
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function DashboardTopbar({ user }: { user?: { name?: string } }) {
  
  return (
    <header className="w-full h-16 flex items-center justify-between px-6 bg-white border-b">
      <div className="font-bold text-lg">Dashboard</div>
      <div className="flex items-center gap-4">
        <Avatar className="w-8 h-8">
          <img src="/avatar.svg" alt="User" />
        </Avatar>
        <span className="font-semibold">{user?.name || "Admin"}</span>
        <Button variant="outline" size="sm">Sign Out</Button>
      </div>
    </header>
  );
}
