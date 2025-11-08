/**
 * AuthPage - Authentication page with dynamic mode support
 * Supports URL query params: ?mode=login or ?mode=signup
 * Used in: /auth route for user authentication and registration
 * Features: Dynamic initial mode, Suspense boundary, AuthGuard protection
 */
"use client";

import { AuthForm } from "@/components/auth/AuthForm";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AuthPageContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const initialMode = mode === "login" ? "login" : "signup";

  return (
    <AuthGuard requireAuth={false}>
      <AuthForm initialMode={initialMode} />
    </AuthGuard>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}
