/**
 * Authentication - User authentication and management functions
 * Handles user registration, login, logout, and session management
 * Features: Server/client auth, session cookies, user profile CRUD operations, OAuth2
 * Used in: Auth components, API routes, and protected pages
 */
import { ID as NodeID, OAuthProvider } from "node-appwrite";
import { ID as BrowserID } from "appwrite";
import {
  createServerClient,
  createClientSideClient,
  DATABASE_ID,
  COLLECTIONS,
} from "./config";
import { sessionManager } from "./sessionManager";

export async function createUser(
  email: string,
  password: string,
  name: string
) {
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
          theme: "dark",
          fontSize: 14,
          editorTheme: "vs-dark",
          autoSave: true,
          tabSize: 2,
        },
      }
    );

    return { success: true, user };
  } catch (error: unknown) {
    console.error("Error creating user:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function signInUser(email: string, password: string) {
  try {
    const { account } = createServerClient();
    const session = await account.createEmailPasswordSession(email, password);
    return { success: true, session };
  } catch (error: unknown) {
    console.error("Error signing in user:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getCurrentUser(session?: string) {
  try {
    const { account } = createServerClient(session);
    const user = await account.get();
    return { success: true, user };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function signOutUser() {
  try {
    const { account } = createServerClient();
    await account.deleteSession("current");
    return { success: true };
  } catch (error: unknown) {
    console.error("Error signing out user:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const clientAuth = {
  async signUp(email: string, password: string, name: string) {
    try {
      const { account } = createClientSideClient();

      try {
        await account.deleteSession("current");
      } catch {
        // No active session to delete
      }

      const user = await account.create(
        BrowserID.unique(),
        email,
        password,
        name
      );
      await account.createEmailPasswordSession(email, password);

      return { success: true, user };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  async signIn(email: string, password: string) {
    try {
      const { account } = createClientSideClient();

      try {
        await account.deleteSession("current");
      } catch {
        // No active session to delete
      }

      const session = await account.createEmailPasswordSession(email, password);
      console.log("[ClientAuth] ✅ Session created");

      // Get user info
      const user = await account.get();
      console.log("[ClientAuth] ✅ User verified:", user.email);

      // Wait for Appwrite to save to localStorage
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Sync Appwrite session to cookie
      sessionManager.syncFromAppwrite();

      return { success: true, session };
    } catch (error: unknown) {
      console.error("[ClientAuth] ❌ Sign in failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  async getCurrentUser() {
    try {
      // Try to restore session if needed
      sessionManager.restoreSession();

      // Get user from Appwrite
      const { account } = createClientSideClient();
      const user = await account.get();
      console.log("[ClientAuth] ✅ User retrieved:", user.email);

      // Sync session to cookie if not already synced
      if (!sessionManager.hasSession()) {
        sessionManager.syncFromAppwrite();
      }

      return { success: true, user };
    } catch (error: unknown) {
      console.warn(
        "[ClientAuth] ⚠️ Failed to get user:",
        error instanceof Error ? error.message : String(error)
      );
      return { success: false, error: null };
    }
  },

  async signOut() {
    try {
      const { account } = createClientSideClient();
      await account.deleteSession("current");
    } catch (error) {
      console.warn("[ClientAuth] ⚠️ Appwrite signout error:", error);
    }

    // Always clear local sessions
    sessionManager.clearSession();
    console.log("[ClientAuth] ✅ Signed out");

    return { success: true };
  },

  // OAuth2 Google Sign In
  async signInWithGoogle() {
    try {
      const { account } = createClientSideClient();

      // Get the current origin for redirect URLs
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";

      // Initiate OAuth2 flow - Appwrite handles account selection automatically
      account.createOAuth2Session(
        "google" as OAuthProvider, // Use string literal for correct provider
        `${origin}/auth/oauth/callback`, // Success redirect
        `${origin}/auth?mode=login&error=oauth_failed` // Failure redirect
      );

      return { success: true };
    } catch (error: unknown) {
      console.error("[ClientAuth] ❌ Google OAuth failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  // Password Recovery - Send recovery email
  async createPasswordRecovery(email: string) {
    try {
      const { account } = createClientSideClient();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";

      // Send recovery email with redirect URL
      await account.createRecovery(
        email,
        `${origin}/reset-password` // Redirect URL for password reset
      );

      console.log("[ClientAuth] ✅ Password recovery email sent");
      return { success: true };
    } catch (error: unknown) {
      console.error("[ClientAuth] ❌ Password recovery failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  // Password Recovery - Complete password reset
  async updatePasswordRecovery(
    userId: string,
    secret: string,
    password: string
  ) {
    try {
      const { account } = createClientSideClient();

      // Complete password reset with userId, secret, and new password
      await account.updateRecovery(userId, secret, password);

      console.log("[ClientAuth] ✅ Password reset successful");
      return { success: true };
    } catch (error: unknown) {
      console.error("[ClientAuth] ❌ Password reset failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
