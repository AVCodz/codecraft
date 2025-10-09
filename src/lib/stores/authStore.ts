import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clientAuth } from '@/lib/appwrite/auth';

interface User {
  $id: string;
  name: string;
  email: string;
  emailVerification: boolean;
  status: boolean;
  labels: string[];
  prefs: Record<string, any>;
  accessedAt: string;
  registration: string;
  passwordUpdate: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user) => {
        set({ 
          user, 
          isAuthenticated: !!user,
          error: null 
        });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      setError: (error) => {
        set({ error });
      },

      signIn: async (email, password) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await clientAuth.signIn(email, password);
          
          if (result.success) {
            console.log('[Auth] Sign in successful, getting user details...');
            const userResult = await clientAuth.getCurrentUser();
            if (userResult.success) {
              console.log('[Auth] User details retrieved:', userResult.user?.email);
              set({ 
                user: userResult.user,
                isAuthenticated: true,
                isLoading: false,
                error: null
              });
              return { success: true };
            } else {
              console.error('[Auth] Failed to get user details');
              set({ isLoading: false, error: 'Failed to get user details' });
              return { success: false, error: 'Failed to get user details' };
            }
          } else {
            console.error('[Auth] Sign in failed:', result.error);
            set({ isLoading: false, error: result.error });
            return { success: false, error: result.error };
          }
        } catch (error: any) {
          const errorMessage = error.message || 'An unexpected error occurred';
          console.error('[Auth] Sign in error:', errorMessage);
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      signUp: async (email, password, name) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await clientAuth.signUp(email, password, name);
          
          if (result.success) {
            // Get user details after successful registration
            const userResult = await clientAuth.getCurrentUser();
            if (userResult.success) {
              set({ 
                user: userResult.user,
                isAuthenticated: true,
                isLoading: false,
                error: null
              });
              return { success: true };
            } else {
              set({ isLoading: false, error: 'Failed to get user details' });
              return { success: false, error: 'Failed to get user details' };
            }
          } else {
            set({ isLoading: false, error: result.error });
            return { success: false, error: result.error };
          }
        } catch (error: any) {
          const errorMessage = error.message || 'An unexpected error occurred';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      signOut: async () => {
        set({ isLoading: true });
        
        try {
          await clientAuth.signOut();
        } catch (error) {
          // Even if Appwrite signout fails, clear local state
          console.warn('Appwrite signout failed:', error);
        }
        
        // Always clear local state
        set({ 
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
        
        // Note: Realtime subscriptions cleanup automatically when components unmount
      },

      checkAuth: async () => {
        const { isAuthenticated } = get();

        // Always try to get current user (it will restore session internally)
        try {
          const result = await clientAuth.getCurrentUser();
          if (result.success && result.user) {
            console.log('[AuthStore] ✅ Auth check passed:', result.user.email);
            set({ user: result.user, isAuthenticated: true, error: null });
          } else {
            // Only clear if we thought we were authenticated
            if (isAuthenticated) {
              console.log('[AuthStore] ⚠️ Auth check failed, clearing state');
              set({
                user: null,
                isAuthenticated: false,
                error: null
              });
            }
          }
        } catch (error) {
          // Only clear if we thought we were authenticated
          if (isAuthenticated) {
            console.error('[AuthStore] ❌ Auth check error, clearing state:', error);
            set({
              user: null,
              isAuthenticated: false,
              error: null
            });
          }
        }
      },

      clearAuth: () => {
        set({ 
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
      },
    }),
    {
      name: 'codecraft-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
