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

export const createClientSideClient = () => {
  const client = new BrowserClient()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

  return {
    client,
    account: new BrowserAccount(client),
    databases: new BrowserDatabases(client),
    storage: new BrowserStorage(client),
  };
};

export const { client, account, databases, storage } = createServerClient();
