/**
 * Simplified Session Manager
 * Relies on Appwrite's built-in localStorage session + Zustand persistence
 * Removes unnecessary complexity while maintaining reliability
 */

import { cookies } from '@/lib/utils/cookies';

const SESSION_COOKIE = 'codecraft_session';
const COOKIE_DAYS = 7; // 7 days

export const sessionManager = {
  /**
   * Save session cookie after successful login
   * Appwrite handles localStorage automatically
   */
  saveSession(sessionSecret: string): void {
    if (typeof window === 'undefined') return;

    // Save simple session cookie
    cookies.set(SESSION_COOKIE, sessionSecret, {
      days: COOKIE_DAYS,
      secure: window.location.protocol === 'https:',
      sameSite: 'Lax',
      path: '/'
    });

    console.log('[SessionManager] ✅ Session saved');
  },

  /**
   * Get session cookie
   */
  getSession(): string | null {
    if (typeof window === 'undefined') return null;
    return cookies.get(SESSION_COOKIE);
  },

  /**
   * Check if session exists
   */
  hasSession(): boolean {
    return !!this.getSession();
  },

  /**
   * Restore Appwrite session from cookie
   * Only needed if Appwrite's localStorage was cleared
   */
  restoreSession(): boolean {
    if (typeof window === 'undefined') return false;

    const session = this.getSession();
    if (!session) {
      console.log('[SessionManager] ℹ️ No session to restore');
      return false;
    }

    // Check if Appwrite already has session
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
    const appwriteKey = `appwrite-${projectId}`;
    const existing = localStorage.getItem(appwriteKey);

    if (existing) {
      console.log('[SessionManager] ℹ️ Appwrite session already exists');
      return true;
    }

    // Restore to Appwrite localStorage
    localStorage.setItem(appwriteKey, session);
    console.log('[SessionManager] ✅ Session restored to Appwrite');
    return true;
  },

  /**
   * Clear all sessions
   */
  clearSession(): void {
    if (typeof window === 'undefined') return;

    // Clear cookie
    cookies.delete(SESSION_COOKIE);

    // Clear Appwrite localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('appwrite')) {
        localStorage.removeItem(key);
      }
    });

    console.log('[SessionManager] ✅ All sessions cleared');
  },

  /**
   * Sync Appwrite session to cookie after login
   */
  syncFromAppwrite(): void {
    if (typeof window === 'undefined') return;

    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
    const appwriteKey = `appwrite-${projectId}`;
    const sessionData = localStorage.getItem(appwriteKey);

    if (sessionData) {
      this.saveSession(sessionData);
      console.log('[SessionManager] ✅ Synced from Appwrite to cookie');
    } else {
      console.warn('[SessionManager] ⚠️ No Appwrite session found to sync');
    }
  },

  /**
   * Initialize on app start
   */
  initialize(): void {
    if (typeof window === 'undefined') return;

    console.log('[SessionManager] 🚀 Initializing...');

    // Try to restore session if Appwrite localStorage is empty
    this.restoreSession();

    console.log('[SessionManager] ✅ Initialized');
  }
};

// Auto-initialize
if (typeof window !== 'undefined') {
  sessionManager.initialize();
}
