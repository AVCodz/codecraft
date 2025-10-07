"use client";

import { useEffect } from 'react';
import { sessionManager } from '@/lib/appwrite/sessionManager';

/**
 * SessionInitializer - Ensures session is restored early in the app lifecycle
 * This component should be mounted in the root layout to restore sessions
 * before any authentication checks happen.
 */
export function SessionInitializer() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    console.log('[SessionInitializer] 🚀 Initializing session restoration...');

    // Clean up expired fallback tokens
    sessionManager.cleanupExpiredFallback();

    // Restore session from cookies to localStorage
    const restored = sessionManager.restoreAppwriteSession();

    if (restored) {
      console.log('[SessionInitializer] ✅ Session restored successfully');
    } else {
      console.log('[SessionInitializer] ℹ️ No session to restore');
    }

    // Log status for debugging
    sessionManager.logSessionStatus();
  }, []);

  // This component doesn't render anything
  return null;
}
