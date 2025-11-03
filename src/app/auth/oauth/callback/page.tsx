/**
 * OAuth Callback Page - Handles OAuth2 redirect after authentication
 * Processes OAuth2 callback, creates user profile if needed, and redirects to home
 * Features: Session creation, user profile setup, error handling
 * Used in: OAuth2 authentication flow (Google, etc.)
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clientAuth } from "@/lib/appwrite/auth";
import { useAuthStore } from "@/lib/stores/authStore";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkAuth } = useAuthStore();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // The OAuth session is automatically created by Appwrite
        // We just need to verify the user is authenticated
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for session to be established

        const result = await clientAuth.getCurrentUser();

        if (result.success && result.user) {
          console.log("[OAuth] ✅ User authenticated:", result.user.email);

          // Check if user profile exists, create if not
          try {
            // The profile should be created automatically by Appwrite
            // But we'll verify the auth state
            await checkAuth();
          } catch (error) {
            console.warn("[OAuth] Profile check warning:", error);
          }

          setStatus("success");

          // Redirect to home page
          setTimeout(() => {
            router.push("/");
          }, 1000);
        } else {
          throw new Error("Failed to authenticate user");
        }
      } catch (error) {
        console.error("[OAuth] ❌ Callback error:", error);
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Authentication failed"
        );

        // Redirect to login with error after 3 seconds
        setTimeout(() => {
          router.push("/login?error=oauth_failed");
        }, 3000);
      }
    };

    handleOAuthCallback();
  }, [router, searchParams, checkAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-4">
        {status === "loading" && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold mb-2">Completing sign in...</h1>
            <p className="text-muted-foreground">
              Please wait while we set up your account.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2">Success!</h1>
            <p className="text-muted-foreground">
              Redirecting you to your dashboard...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-destructive"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2">Authentication Failed</h1>
            <p className="text-muted-foreground mb-4">{errorMessage}</p>
            <p className="text-sm text-muted-foreground">
              Redirecting you back to login...
            </p>
          </>
        )}
      </div>
    </div>
  );
}

