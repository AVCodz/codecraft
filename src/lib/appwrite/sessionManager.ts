// Session manager with main cookie + fallback LocalDB approach
import { cookies } from '@/lib/utils/cookies';
import { localDB } from '@/lib/localdb';

// Cookie names
const MAIN_AUTH_COOKIE = 'codecraft_auth_session';      // Main authentication cookie
const FALLBACK_COOKIE_KEY = 'codecraft_fallback_token'; // Fallback in LocalDB

// Cookie/Token expiry
const MAIN_COOKIE_DAYS = 365;     // 1 year
const FALLBACK_TOKEN_DAYS = 7;    // 7 days

interface FallbackToken {
  token: string;
  userId: string;
  email: string;
  createdAt: string;
  expiresAt: string;
}

export const sessionManager = {
  // Save main auth cookie + fallback token to LocalDB
  saveAuthSession(sessionToken: string, userData: { $id: string; email: string }): void {
    if (typeof window === 'undefined') return;

    // 1. Save MAIN cookie (1 year expiry)
    cookies.set(MAIN_AUTH_COOKIE, sessionToken, {
      days: MAIN_COOKIE_DAYS,
      secure: window.location.protocol === 'https:',
      sameSite: 'Lax',
      path: '/'
    });

    console.log('[SessionManager] ✅ Main auth cookie saved (expires in 1 year)');

    // 2. Create and save FALLBACK token to LocalDB (7 days expiry)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + FALLBACK_TOKEN_DAYS * 24 * 60 * 60 * 1000);

    const fallbackToken: FallbackToken = {
      token: sessionToken,
      userId: userData.$id,
      email: userData.email,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    // Store in LocalDB (uses localStorage under the hood)
    if (typeof window !== 'undefined') {
      localStorage.setItem(FALLBACK_COOKIE_KEY, JSON.stringify(fallbackToken));
      console.log('[SessionManager] ✅ Fallback token saved to LocalDB (expires in 7 days)');
    }
  },

  // Get session from MAIN cookie
  getMainSession(): string | null {
    if (typeof window === 'undefined') return null;

    const session = cookies.get(MAIN_AUTH_COOKIE);
    if (session) {
      console.log('[SessionManager] ✅ Main cookie found');
      return session;
    }

    console.log('[SessionManager] ❌ Main cookie not found');
    return null;
  },

  // Get fallback token from LocalDB (and check if expired)
  getFallbackToken(): FallbackToken | null {
    if (typeof window === 'undefined') return null;

    const stored = localStorage.getItem(FALLBACK_COOKIE_KEY);
    if (!stored) {
      console.log('[SessionManager] ❌ No fallback token in LocalDB');
      return null;
    }

    try {
      const fallback: FallbackToken = JSON.parse(stored);

      // Check if expired
      const now = new Date();
      const expiresAt = new Date(fallback.expiresAt);

      if (now > expiresAt) {
        console.log('[SessionManager] ⚠️ Fallback token expired (7 days passed)');
        // Clean up expired token
        localStorage.removeItem(FALLBACK_COOKIE_KEY);
        return null;
      }

      console.log('[SessionManager] ✅ Valid fallback token found in LocalDB');
      return fallback;
    } catch (error) {
      console.error('[SessionManager] Error parsing fallback token:', error);
      return null;
    }
  },

  // Get session (tries main cookie first, then fallback)
  getSession(): string | null {
    // 1. Try main cookie
    const mainSession = this.getMainSession();
    if (mainSession) return mainSession;

    // 2. Try fallback token from LocalDB
    const fallback = this.getFallbackToken();
    if (fallback) {
      console.log('[SessionManager] Using fallback token from LocalDB');

      // Restore main cookie from fallback
      this.restoreMainCookieFromFallback(fallback);

      return fallback.token;
    }

    // 3. Try Appwrite's localStorage as last resort
    const keys = Object.keys(localStorage);
    const sessionKey = keys.find(key =>
      key.includes('appwrite') &&
      (key.includes('session') || key.includes('cookie'))
    );

    if (sessionKey) {
      const token = localStorage.getItem(sessionKey);
      console.log('[SessionManager] Found Appwrite localStorage session');
      return token;
    }

    return null;
  },

  // Restore main cookie from fallback
  restoreMainCookieFromFallback(fallback: FallbackToken): void {
    console.log('[SessionManager] 🔄 Restoring main cookie from fallback');

    cookies.set(MAIN_AUTH_COOKIE, fallback.token, {
      days: MAIN_COOKIE_DAYS,
      secure: window.location.protocol === 'https:',
      sameSite: 'Lax',
      path: '/'
    });

    console.log('[SessionManager] ✅ Main cookie restored');
  },

  // Sync Appwrite localStorage session to cookies (after login)
  syncAppwriteSessionToCookies(userData?: { $id: string; email: string }): void {
    if (typeof window === 'undefined') return;

    // Clean up any expired fallback first
    this.cleanupExpiredFallback();

    // Find Appwrite session in localStorage
    const keys = Object.keys(localStorage);
    const sessionKey = keys.find(key =>
      key.includes('appwrite') &&
      (key.includes('session') || key.includes('cookie') || key.includes('fallback'))
    );

    if (sessionKey) {
      const sessionData = localStorage.getItem(sessionKey);
      if (sessionData) {
        try {
          // Try to parse as JSON to extract user data
          let user = userData;
          if (!user) {
            try {
              const parsed = JSON.parse(sessionData);
              user = {
                $id: parsed.userId || parsed.$id || '',
                email: parsed.providerUid || parsed.email || ''
              };
            } catch {
              // If not JSON, just use session string directly
              user = { $id: '', email: '' };
            }
          }

          // Save both main cookie and fallback
          this.saveAuthSession(sessionData, user);
          console.log('[SessionManager] ✅ Synced session to cookies with userData:', user.email);
        } catch (error) {
          console.error('[SessionManager] Error syncing session:', error);
        }
      }
    } else {
      console.warn('[SessionManager] ⚠️ No Appwrite session found in localStorage to sync');
    }
  },

  // Restore Appwrite session to localStorage (from main cookie or fallback)
  restoreAppwriteSession(): boolean {
    if (typeof window === 'undefined') return false;

    // Clean up expired fallback first
    this.cleanupExpiredFallback();

    const session = this.getSession();
    if (!session) {
      console.warn('[SessionManager] ❌ No session found to restore');
      return false;
    }

    // Find or create Appwrite session key
    const keys = Object.keys(localStorage);
    let sessionKey = keys.find(key =>
      key.includes('appwrite') &&
      (key.includes('session') || key.includes('cookie'))
    );

    if (!sessionKey) {
      const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
      sessionKey = `appwrite-${projectId}`;
      console.log('[SessionManager] 🔧 Creating new Appwrite session key:', sessionKey);
    }

    // Get current session in localStorage
    const currentSession = localStorage.getItem(sessionKey);

    // Only update if different
    if (currentSession !== session) {
      localStorage.setItem(sessionKey, session);
      console.log('[SessionManager] ✅ Appwrite session restored to localStorage');
    } else {
      console.log('[SessionManager] ℹ️ Appwrite session already up to date');
    }

    return true;
  },

  // Check if a valid session exists
  hasValidSession(): boolean {
    const session = this.getSession();
    return !!session;
  },

  // Refresh fallback token (resets 7-day expiry)
  refreshFallbackToken(): void {
    if (typeof window === 'undefined') return;

    const fallback = this.getFallbackToken();
    if (!fallback) {
      // No fallback exists, try to create one from current session
      const mainSession = this.getMainSession();
      if (mainSession) {
        // Get user data from Zustand auth store
        const authData = localStorage.getItem('codecraft-auth');
        if (authData) {
          try {
            const auth = JSON.parse(authData);
            if (auth.state?.user) {
              this.saveAuthSession(mainSession, {
                $id: auth.state.user.$id,
                email: auth.state.user.email
              });
              console.log('[SessionManager] ✅ Created fallback token from main session');
            }
          } catch (error) {
            console.error('[SessionManager] Error creating fallback:', error);
          }
        }
      }
      return;
    }

    // Check if fallback is still valid (not expired)
    const now = new Date();
    const expiresAt = new Date(fallback.expiresAt);

    if (now > expiresAt) {
      console.log('[SessionManager] ⚠️ Fallback expired, not refreshing');
      localStorage.removeItem(FALLBACK_COOKIE_KEY);
      return;
    }

    // Create new fallback with fresh 7-day expiry
    const newExpiresAt = new Date(now.getTime() + FALLBACK_TOKEN_DAYS * 24 * 60 * 60 * 1000);

    const refreshedToken: FallbackToken = {
      ...fallback,
      createdAt: now.toISOString(),
      expiresAt: newExpiresAt.toISOString()
    };

    localStorage.setItem(FALLBACK_COOKIE_KEY, JSON.stringify(refreshedToken));
    console.log('[SessionManager] ✅ Fallback token refreshed (7 days extended)');
  },

  // Clean up expired fallback tokens
  cleanupExpiredFallback(): void {
    if (typeof window === 'undefined') return;

    const fallback = this.getFallbackToken();
    if (!fallback) {
      // Already cleaned up or doesn't exist
      return;
    }

    const now = new Date();
    const expiresAt = new Date(fallback.expiresAt);

    if (now > expiresAt) {
      console.log('[SessionManager] 🧹 Cleaning up expired fallback token (7 days passed)');
      localStorage.removeItem(FALLBACK_COOKIE_KEY);
    }
  },

  // Clear all sessions
  clearSession(): void {
    if (typeof window === 'undefined') return;

    // Clear main cookie
    cookies.delete(MAIN_AUTH_COOKIE);

    // Clear fallback token from LocalDB
    localStorage.removeItem(FALLBACK_COOKIE_KEY);

    // Clear Appwrite localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('appwrite')) {
        localStorage.removeItem(key);
      }
    });

    console.log('[SessionManager] ✅ All sessions cleared (main cookie + fallback + Appwrite)');
  },

  // Log session status for debugging
  logSessionStatus(): void {
    if (typeof window === 'undefined') return;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[SessionManager] 🔍 Session Status Check');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Check main cookie
    const mainCookie = this.getMainSession();
    if (mainCookie) {
      console.log('✅ Main Cookie (codecraft_auth_session):');
      console.log('   Status: ACTIVE (expires in 1 year)');
      console.log('   Token:', mainCookie.substring(0, 50) + '...');
    } else {
      console.log('❌ Main Cookie: NOT FOUND');
    }

    // Check fallback token
    const fallback = this.getFallbackToken();
    if (fallback) {
      const expiresAt = new Date(fallback.expiresAt);
      const now = new Date();
      const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      console.log('✅ Fallback Token (LocalDB):');
      console.log('   Status: ACTIVE');
      console.log('   User:', fallback.email);
      console.log('   Expires in:', daysLeft, 'days');
      console.log('   Created:', new Date(fallback.createdAt).toLocaleString());
    } else {
      console.log('❌ Fallback Token: NOT FOUND or EXPIRED');
    }

    // Check Appwrite localStorage
    const keys = Object.keys(localStorage);
    const appwriteKeys = keys.filter(key => key.includes('appwrite'));

    if (appwriteKeys.length > 0) {
      console.log('✅ Appwrite localStorage:');
      appwriteKeys.forEach(key => {
        console.log('   -', key);
      });
    } else {
      console.log('❌ Appwrite localStorage: EMPTY');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  },

  // Initialize session manager (call on app start)
  initialize(): void {
    if (typeof window === 'undefined') return;

    console.log('[SessionManager] 🚀 Initializing session manager...');

    // Clean up expired fallback tokens
    this.cleanupExpiredFallback();

    // Try to restore session from cookies to localStorage
    this.restoreAppwriteSession();

    // Set up periodic cleanup (every 24 hours)
    setInterval(() => {
      console.log('[SessionManager] 🧹 Running periodic cleanup...');
      this.cleanupExpiredFallback();
    }, 24 * 60 * 60 * 1000);

    console.log('[SessionManager] ✅ Session manager initialized');
  }
};

// Auto-initialize on module load (client-side only)
if (typeof window !== 'undefined') {
  // Use setTimeout to ensure this runs after initial page load
  setTimeout(() => {
    sessionManager.initialize();
  }, 100);
}
