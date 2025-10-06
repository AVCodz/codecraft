"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/authStore";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    const handleAuth = async () => {
      await checkAuth();

      if (isAuthenticated) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    };

    handleAuth();
  }, [isAuthenticated, checkAuth, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading CodeCraft AI...</p>
      </div>
    </div>
  );
}
