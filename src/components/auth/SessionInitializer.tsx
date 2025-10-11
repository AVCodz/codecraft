/**
 * SessionInitializer - Early session restoration component
 * Restores user sessions from cookies/localStorage before authentication checks
 * Features: Automatic session recovery, prevents unnecessary re-logins
 * Used in: Root layout to initialize sessions on app load
 */
"use client";

import { useEffect } from 'react';
import { sessionManager } from '@/lib/appwrite/sessionManager';
export function SessionInitializer() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    console.log('[SessionInitializer] 🚀 Initializing session...');

    // Initialize session manager (restore from cookie if needed)
    sessionManager.initialize();

    console.log('[SessionInitializer] ✅ Session initialized');
  }, []);

  // This component doesn't render anything
  return null;
}
