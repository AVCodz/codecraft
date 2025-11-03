/**
 * AuthGuard - Route protection component for authentication
 * Protects routes by checking authentication status and redirecting unauthorized users
 * Features: Configurable redirects, loading states, optional auth requirement
 * Used in: Dashboard, project pages, and other protected routes
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/authStore";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function AuthGuard({
  children,
  requireAuth = true,
  redirectTo = "/login",
}: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    const handleAuthCheck = async () => {
      // If logged in trying to access login/register, redirect immediately
      if (!requireAuth && isAuthenticated && !hasRedirected) {
        console.log("[AuthGuard] Already authenticated, redirecting to home");
        setHasRedirected(true);
        router.push("/");
        return;
      }

      // If not authenticated and needs auth, check with server
      if (requireAuth && !isAuthenticated) {
        setIsChecking(true);
        await checkAuth();
        setIsChecking(false);

        // After check, if still not authenticated, redirect to login
        const { isAuthenticated: stillAuth } = useAuthStore.getState();
        if (!stillAuth) {
          router.push(redirectTo);
        }
      }
    };

    handleAuthCheck();
  }, [
    isAuthenticated,
    requireAuth,
    redirectTo,
    router,
    checkAuth,
    hasRedirected,
  ]);

  // Instant redirect for already authenticated users trying to access login/register
  if (!requireAuth && isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  // Show loading only when actively checking with server
  if (requireAuth && !isAuthenticated && isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
