/**
 * Home Page - Dynamic landing based on authentication status
 * Shows marketing page for guests, project creation page for authenticated users
 * Features: Auth-aware routing, instant project creation for logged-in users
 * Used as: Main entry point (/)
 */
"use client";

import { useAuthStore } from "@/lib/stores/authStore";
import { GuestWelcomeScreen } from "@/components/ui/landing/GuestWelcomeScreen";
import { AuthedLandingPage } from "@/components/ui/landing/AuthedLandingPage";

export default function Home() {
  const { isAuthenticated } = useAuthStore();

  // Show authenticated landing for logged-in users, guest welcome for others
  return isAuthenticated ? <AuthedLandingPage /> : <GuestWelcomeScreen />;
}
