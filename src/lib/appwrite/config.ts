/**
 * Appwrite Configuration - Centralized Appwrite client setup
 * Configures and exports Appwrite clients for server and browser environments
 * Features: Server/client SDKs, database/storage/account services, environment config
 * Used in: All Appwrite service files for database, storage, and authentication
 */
import { Client as NodeClient, Account as NodeAccount, Databases as NodeDatabases, Storage as NodeStorage } from "node-appwrite";
import { Client as BrowserClient, Account as BrowserAccount, Databases as BrowserDatabases, Storage as BrowserStorage } from "appwrite";

export const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
export const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
export const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;

export const DATABASE_ID =
  process.env.NEXT_PUBLIC_DATABASE_ID || "codecraft_main";
export const COLLECTIONS = {
  USERS_PROFILES:
    process.env.NEXT_PUBLIC_USERS_COLLECTION_ID || "users_profiles",
  PROJECTS: process.env.NEXT_PUBLIC_PROJECTS_COLLECTION_ID || "projects",
  MESSAGES: process.env.NEXT_PUBLIC_MESSAGES_COLLECTION_ID || "messages",
  PROJECT_FILES: process.env.NEXT_PUBLIC_FILES_COLLECTION_ID || "project_files",
};

export const BUCKETS = {
  PROJECT_EXPORTS:
    process.env.NEXT_PUBLIC_EXPORTS_BUCKET_ID || "project-exports",
  USER_AVATARS: process.env.NEXT_PUBLIC_AVATARS_BUCKET_ID || "user-avatars",
};

export const createServerClient = (session?: string) => {
  const client = new NodeClient()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

  if (APPWRITE_API_KEY) {
    client.setKey(APPWRITE_API_KEY);
  }

  if (session) {
    client.setSession(session);
  }

  return {
    client,
    account: new NodeAccount(client),
    databases: new NodeDatabases(client),
    storage: new NodeStorage(client),
  };
};

// Create a singleton browser client to persist across the app
let browserClientInstance: {
  client: BrowserClient;
  account: BrowserAccount;
  databases: BrowserDatabases;
  storage: BrowserStorage;
} | null = null;

export const createClientSideClient = () => {
  // Return existing instance if available
  if (browserClientInstance) {
    return browserClientInstance;
  }

  // Create new client with cookie-based session storage
  const client = new BrowserClient();

  client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

  // Note: Appwrite browser SDK doesn't support native cookie storage
  // We'll implement a custom cookie-based session handler

  browserClientInstance = {
    client,
    account: new BrowserAccount(client),
    databases: new BrowserDatabases(client),
    storage: new BrowserStorage(client),
  };

  return browserClientInstance;
};

export const { client, account, databases, storage } = createServerClient();
