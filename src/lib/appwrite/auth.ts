import { ID as NodeID } from 'node-appwrite';
import { ID as BrowserID } from 'appwrite';
import { createServerClient, createClientSideClient, databases, DATABASE_ID, COLLECTIONS } from './config';
import { AuthUser, CreateUserProfileData } from '@/lib/types';

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
      return { success: true, session };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async getCurrentUser() {
    try {
      const { account } = createClientSideClient();
      const user = await account.get();
      return { success: true, user };
    } catch (error: any) {
      return { success: false, error: null };
    }
  },

  async signOut() {
    try {
      const { account } = createClientSideClient();
      await account.deleteSession('current');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
};
