"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useApp } from "@/components/providers/AppProviders";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isHydrated, session } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!session.isAuthenticated) {
      router.replace("/auth");
      return;
    }

    if (!session.hasCompletedSetup && pathname !== "/setup") {
      router.replace("/setup");
    }
  }, [isHydrated, pathname, router, session.hasCompletedSetup, session.isAuthenticated]);

  if (
    !isHydrated ||
    !session.isAuthenticated ||
    (!session.hasCompletedSetup && pathname !== "/setup")
  ) {
    return (
      <main className="auth-page">
        <div className="loading-card">Preparing GamerFolio...</div>
      </main>
    );
  }

  return children;
}
