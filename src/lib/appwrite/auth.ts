import { ID as NodeID } from 'node-appwrite';
import { ID as BrowserID } from 'appwrite';
import { createServerClient, createClientSideClient, databases, DATABASE_ID, COLLECTIONS } from './config';
import { AuthUser, CreateUserProfileData } from '@/lib/types';
import { sessionManager } from './sessionManager';

export async function createUser(email: string, password: string, name: string) {
  try {
    const { account, databases } = createServerClient();
    
    const user = await account.create(NodeID.unique(), email, password, name);
    
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.USERS_PROFILES,
      NodeID.unique(),
      {
        userId: user.$id,
        displayName: name,
        preferences: {
          theme: 'dark',
          fontSize: 14,
          editorTheme: 'vs-dark',
          autoSave: true,
          tabSize: 2,
        },
      }
    );
    
    return { success: true, user };
  } catch (error: any) {
    console.error('Error creating user:', error);
    return { success: false, error: error.message };
  }
}

export async function signInUser(email: string, password: string) {
  try {
    const { account } = createServerClient();
    const session = await account.createEmailPasswordSession(email, password);
    return { success: true, session };
  } catch (error: any) {
    console.error('Error signing in user:', error);
    return { success: false, error: error.message };
  }
}

export async function getCurrentUser(session?: string) {
  try {
    const { account } = createServerClient(session);
    const user = await account.get();
    return { success: true, user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function signOutUser() {
  try {
    const { account } = createServerClient();
    await account.deleteSession('current');
    return { success: true };
  } catch (error: any) {
    console.error('Error signing out user:', error);
    return { success: false, error: error.message };
  }
}

export const clientAuth = {
  async signUp(email: string, password: string, name: string) {
    try {
      const { account } = createClientSideClient();
      
      try {
        await account.deleteSession('current');
      } catch {
        // No active session to delete
      }
      
      const user = await account.create(BrowserID.unique(), email, password, name);
      await account.createEmailPasswordSession(email, password);
      
      return { success: true, user };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async signIn(email: string, password: string) {
    try {
      const { account } = createClientSideClient();

      try {
        await account.deleteSession('current');
      } catch {
        // No active session to delete
      }

      const session = await account.createEmailPasswordSession(email, password);
      console.log('[ClientAuth] ✅ Session created with Appwrite');
      console.log('[ClientAuth] 🔍 Session data:', session);

      // Get user info
      const user = await account.get();
      console.log('[ClientAuth] ✅ User verified:', user.email);

      // Wait a moment for Appwrite to save to localStorage
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check what Appwrite saved
      console.log('[ClientAuth] 🔍 Checking localStorage after login...');
      const keys = Object.keys(localStorage);
      const appwriteKeys = keys.filter(key => key.includes('appwrite'));
      console.log('[ClientAuth] Appwrite keys found:', appwriteKeys);

      // DIRECT SAVE: Use the session secret directly instead of trying to find it
      const sessionToken = session.secret || session.$id || JSON.stringify(session);
      console.log('[ClientAuth] 💾 Saving session token directly');

      sessionManager.saveAuthSession(sessionToken, {
        $id: user.$id,
        email: user.email
      });

      // Also ensure it's in Appwrite's localStorage
      const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
      const sessionKey = `appwrite-${projectId}`;
      localStorage.setItem(sessionKey, sessionToken);

      // Log final session status
      sessionManager.logSessionStatus();

      return { success: true, session };
    } catch (error: any) {
      console.error('[ClientAuth] ❌ Sign in failed:', error);
      return { success: false, error: error.message };
    }
  },

  async getCurrentUser() {
    try {
      // Try to restore session from cookies/fallback
      const restored = sessionManager.restoreAppwriteSession();

      if (restored) {
        // Small delay to ensure localStorage is updated
        await new Promise(resolve => setTimeout(resolve, 50));
      } else {
        console.log('[ClientAuth] ℹ️ No session in cookies/fallback, trying direct Appwrite fetch...');
      }

      // Log current session status
      sessionManager.logSessionStatus();

      // Try to get user directly from Appwrite (it may have session in localStorage already)
      const { account } = createClientSideClient();
      const user = await account.get();
      console.log('[ClientAuth] ✅ Successfully retrieved user:', user.email);

      // If we got the user, sync everything
      console.log('[ClientAuth] 💾 Syncing session after successful user fetch...');

      // Find and save the Appwrite session
      const keys = Object.keys(localStorage);
      const sessionKey = keys.find(key => key.includes('appwrite'));
      if (sessionKey) {
        const sessionData = localStorage.getItem(sessionKey);
        if (sessionData) {
          sessionManager.saveAuthSession(sessionData, {
            $id: user.$id,
            email: user.email
          });
          console.log('[ClientAuth] ✅ Session synced to cookies');
        }
      }

      // Refresh fallback token to extend 7-day expiry
      sessionManager.refreshFallbackToken();

      return { success: true, user };
    } catch (error: any) {
      console.warn('[ClientAuth] ❌ Failed to get current user:', error.message);

      // Try one more time with fallback token
      try {
        console.log('[ClientAuth] 🔄 Attempting fallback restore...');
        const fallback = sessionManager.getFallbackToken();
        if (fallback) {
          sessionManager.restoreMainCookieFromFallback(fallback);

          // Restore to Appwrite localStorage
          const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
          const sessionKey = `appwrite-${projectId}`;
          localStorage.setItem(sessionKey, fallback.token);

          await new Promise(resolve => setTimeout(resolve, 100));

          const { account } = createClientSideClient();
          const user = await account.get();
          console.log('[ClientAuth] ✅ Fallback restore successful:', user.email);

          sessionManager.refreshFallbackToken();
          return { success: true, user };
        }
      } catch (retryError) {
        console.error('[ClientAuth] ❌ Fallback restore also failed');
      }

      sessionManager.logSessionStatus();
      return { success: false, error: null };
    }
  },

  async signOut() {
    try {
      const { account } = createClientSideClient();
      await account.deleteSession('current');

      // Clear all sessions (localStorage and cookies)
      sessionManager.clearSession();
      console.log('[ClientAuth] ✅ Signed out and cleared all sessions');

      return { success: true };
    } catch (error: any) {
      // Even if Appwrite signout fails, clear local sessions
      sessionManager.clearSession();
      return { success: false, error: error.message };
    }
  },
};
