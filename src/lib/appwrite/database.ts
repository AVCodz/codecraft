import { ID, Query } from 'node-appwrite';
import { databases, DATABASE_ID, COLLECTIONS } from './config';
import { 
  Project, 
  CreateProjectData, 
  UpdateProjectData,
  Message,
  CreateMessageData,
  ProjectFile,
  CreateFileData,
  UpdateFileData,
  UserProfile,
  CreateUserProfileData,
  UpdateUserProfileData
} from '@/lib/types';
import { getFileName, getLanguageFromPath } from '@/lib/utils/fileSystem';

// Project operations
export async function createProject(userId: string, data: CreateProjectData): Promise<Project> {
  const slug = generateSlug(data.title);
  const now = new Date().toISOString();
  
  const project = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.PROJECTS,
    ID.unique(),
    {
      userId,
      title: data.title,
      slug,
      description: data.description || '',
      status: 'active',
      framework: data.framework || 'react',
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    }
  );
  
  return project as unknown as Project;
}

export async function getUserProjects(userId: string): Promise<Project[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROJECTS,
    [
      Query.equal('userId', userId),
      Query.equal('status', 'active'),
      Query.orderDesc('lastMessageAt'),
      Query.limit(50)
    ]
  );
  
  return response.documents as unknown as unknown as Project[];
}

export async function getProject(projectId: string): Promise<Project | null> {
  try {
    const project = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      projectId
    );
  return project as unknown as unknown as Project;
  } catch (error) {
    return null;
  }
}

export async function updateProject(projectId: string, data: UpdateProjectData): Promise<Project> {
  const project = await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.PROJECTS,
    projectId,
    data
  );
  
  return project as unknown as Project;
}

export async function deleteProject(projectId: string): Promise<void> {
  await databases.deleteDocument(
    DATABASE_ID,
    COLLECTIONS.PROJECTS,
    projectId
  );
}

// Message operations
export async function createMessage(data: CreateMessageData): Promise<Message> {
  const now = new Date().toISOString();
  const metadata = typeof data.metadata === 'string' ? data.metadata : data.metadata ? JSON.stringify(data.metadata) : undefined;

  const message = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.MESSAGES,
    ID.unique(),
    {
      ...data,
      metadata,
      createdAt: now,
      updatedAt: now,
    }
  );

  return message as unknown as Message;
}

export async function getProjectMessages(projectId: string): Promise<Message[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.MESSAGES,
    [
      Query.equal('projectId', projectId),
      Query.orderAsc('sequence'),
      Query.limit(100)
    ]
  );
  
  return response.documents as unknown as unknown as Message[];
}

// File operations
export async function createFile(data: CreateFileData): Promise<ProjectFile> {
  const now = data.createdAt ?? new Date().toISOString();
  const isFile = data.type === 'file';
  const resolvedContent = isFile ? (data.content ?? '') : undefined;
  const resolvedLanguage = isFile
    ? data.language ?? getLanguageFromPath(data.path)
    : undefined;
  const resolvedSize = isFile ? data.size ?? Buffer.byteLength(resolvedContent ?? '', 'utf-8') : 0;

  const payload = {
    projectId: data.projectId,
    userId: data.userId,
    path: data.path,
    name: data.name ?? getFileName(data.path),
    type: data.type,
    content: resolvedContent,
    language: resolvedLanguage,
    size: resolvedSize,
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now,
  };

  const file = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.PROJECT_FILES,
    ID.unique(),
    payload
  );
  
  return file as unknown as unknown as ProjectFile;
}

export async function getProjectFiles(projectId: string): Promise<ProjectFile[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROJECT_FILES,
    [
      Query.equal('projectId', projectId),
      Query.orderAsc('path'),
      Query.limit(200)
    ]
  );
  
  return response.documents as unknown as unknown as unknown as ProjectFile[];
}

export async function updateFile(fileId: string, data: UpdateFileData): Promise<ProjectFile> {
  const now = data.updatedAt ?? new Date().toISOString();
  const payload = {
    ...data,
    size: data.size ?? (data.content ? Buffer.byteLength(data.content, 'utf-8') : undefined),
    updatedAt: now,
  };

  const file = await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.PROJECT_FILES,
    fileId,
    payload
  );
  
  return file as unknown as unknown as ProjectFile;
}

export async function deleteFile(fileId: string): Promise<void> {
  await databases.deleteDocument(
    DATABASE_ID,
    COLLECTIONS.PROJECT_FILES,
    fileId
  );
}

// User profile operations
export async function createUserProfile(data: CreateUserProfileData): Promise<UserProfile> {
  const profile = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.USERS_PROFILES,
    ID.unique(),
    data
  );
  
  return profile as unknown as UserProfile;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.USERS_PROFILES,
      [Query.equal('userId', userId)]
    );
    
    return response.documents[0] as unknown as UserProfile || null;
  } catch (error) {
    return null;
  }
}

export async function updateUserProfile(profileId: string, data: UpdateUserProfileData): Promise<UserProfile> {
  const profile = await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.USERS_PROFILES,
    profileId,
    data
  );
  
  return profile as unknown as UserProfile;
}

// Utility functions
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    + '-' + Math.random().toString(36).substr(2, 6);
}
