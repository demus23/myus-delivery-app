import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import React, { useEffect, ReactNode } from "react";

type RequireAdminProps = {
  children: ReactNode;
};

export default function RequireAdmin({ children }: RequireAdminProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "admin") {
      router.replace("/403");
    }
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [session, status, router]);

  if (status === "loading") return <div>Loading...</div>;
  if (session?.user?.role !== "admin") return null;

  return <>{children}</>;
}
