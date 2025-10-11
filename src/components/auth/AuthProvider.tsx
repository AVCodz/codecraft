/**
 * AuthProvider - Authentication state provider component
 * Initializes and maintains authentication state across the application
 * Features: Auto-checks authentication on mount, persists user session
 * Used in: Root layout to wrap entire application
 */
'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    // Handle hydration
    setIsHydrated(true);
    
    // Check auth status on mount
    checkAuth();
  }, [checkAuth]);

  // Prevent hydration mismatch by not rendering until hydrated
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
