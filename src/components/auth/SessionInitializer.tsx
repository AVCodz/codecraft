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

    console.log('[SessionInitializer] 🚀 Initializing session...');

    // Initialize session manager (restore from cookie if needed)
    sessionManager.initialize();

    console.log('[SessionInitializer] ✅ Session initialized');
  }, []);

  // This component doesn't render anything
  return null;
}
