/**
 * Realtime Service - Appwrite real-time subscription manager
 * Manages WebSocket connections for live data synchronization
 * Features: Project/message/file subscriptions, auto-reconnect, event handling
 * Used in: useRealtimeSync hook for live updates across clients
 */
import { createClientSideClient, DATABASE_ID, COLLECTIONS } from './config';
import type { Project, Message, ProjectFile } from '@/lib/types';
import { Query } from 'appwrite';

type UnsubscribeFn = () => void;

class RealtimeService {
  private client = createClientSideClient().client;
  private databases = createClientSideClient().databases;

  // Subscribe to projects for a user
  subscribeToProjects(
    userId: string,
    callbacks: {
      onCreate?: (project: Project) => void;
      onUpdate?: (project: Project) => void;
      onDelete?: (projectId: string) => void;
    }
  ): UnsubscribeFn {
    const channel = `databases.${DATABASE_ID}.collections.${COLLECTIONS.PROJECTS}.documents`;
    
    return this.client.subscribe(channel, (response) => {
      const project = response.payload as unknown as Project;
      if (project.userId !== userId) return;

      const events = response.events;
      
      if (events.some((e: string) => e.includes('.create'))) {
        callbacks.onCreate?.(project);
      } else if (events.some((e: string) => e.includes('.update'))) {
        callbacks.onUpdate?.(project);
      } else if (events.some((e: string) => e.includes('.delete'))) {
        callbacks.onDelete?.(project.$id);
      }
    });
  }

  // Subscribe to files in a project
  subscribeToFiles(
    projectId: string,
    callbacks: {
      onCreate?: (file: ProjectFile) => void;
      onUpdate?: (file: ProjectFile) => void;
      onDelete?: (fileId: string) => void;
    }
  ): UnsubscribeFn {
    const channel = `databases.${DATABASE_ID}.collections.${COLLECTIONS.PROJECT_FILES}.documents`;
    
    return this.client.subscribe(channel, (response) => {
      const file = response.payload as unknown as ProjectFile;
      if (file.projectId !== projectId) return;

      const events = response.events;
      
      if (events.some((e: string) => e.includes('.create'))) {
        callbacks.onCreate?.(file);
      } else if (events.some((e: string) => e.includes('.update'))) {
        callbacks.onUpdate?.(file);
      } else if (events.some((e: string) => e.includes('.delete'))) {
        callbacks.onDelete?.(file.$id);
      }
    });
  }

  // Subscribe to messages in a project
  subscribeToMessages(
    projectId: string,
    callbacks: {
      onCreate?: (message: Message) => void;
      onUpdate?: (message: Message) => void;
      onDelete?: (messageId: string) => void;
    }
  ): UnsubscribeFn {
    const channel = `databases.${DATABASE_ID}.collections.${COLLECTIONS.MESSAGES}.documents`;
    
    return this.client.subscribe(channel, (response) => {
      const message = response.payload as unknown as Message;
      if (message.projectId !== projectId) return;

      const events = response.events;
      
      if (events.some((e: string) => e.includes('.create'))) {
        callbacks.onCreate?.(message);
      } else if (events.some((e: string) => e.includes('.update'))) {
        callbacks.onUpdate?.(message);
      } else if (events.some((e: string) => e.includes('.delete'))) {
        callbacks.onDelete?.(message.$id);
      }
    });
  }

  // Get initial data
  async getProjects(userId: string): Promise<Project[]> {
    const response = await this.databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      [Query.equal('userId', userId), Query.limit(100)]
    );
    return response.documents as unknown as Project[];
  }

  async getFiles(projectId: string): Promise<ProjectFile[]> {
    const response = await this.databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECT_FILES,
      [Query.equal('projectId', projectId), Query.limit(5000)]
    );
    return response.documents as unknown as ProjectFile[];
  }

  async getMessages(projectId: string): Promise<Message[]> {
    const response = await this.databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.MESSAGES,
      [Query.equal('projectId', projectId), Query.orderAsc('sequence'), Query.limit(1000)]
    );
    return response.documents as unknown as Message[];
  }
}

export const realtimeService = new RealtimeService();
export { Query };
