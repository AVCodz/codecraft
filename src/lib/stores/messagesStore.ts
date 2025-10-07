import { create } from 'zustand';
import { Message } from '@/lib/types';
import { localDB } from '@/lib/localdb';

interface MessagesState {
  // State
  messagesByProject: Record<string, Message[]>;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;

  // Actions
  setMessages: (projectId: string, messages: Message[]) => void;
  addMessage: (projectId: string, message: Message) => void;
  updateMessage: (projectId: string, messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (projectId: string, messageId: string) => void;
  setLoading: (loading: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setError: (error: string | null) => void;

  // LocalDB + Appwrite sync methods
  loadFromLocalDB: (projectId: string) => void;
  syncWithAppwrite: (projectId: string, userId: string) => Promise<void>;
  getMessages: (projectId: string) => Message[];
  clearProjectMessages: (projectId: string) => void;
  reset: () => void;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  // Initial state
  messagesByProject: {},
  isLoading: false,
  isSyncing: false,
  error: null,

  // Actions
  setMessages: (projectId, messages) => {
    const { messagesByProject } = get();
    set({
      messagesByProject: {
        ...messagesByProject,
        [projectId]: messages
      }
    });

    // Update LocalDB
    const allMessages = localDB.getAll<Message>('codeCraft_messages');
    const otherMessages = allMessages.filter(m => m.projectId !== projectId);
    localDB.setItems('codeCraft_messages', [...otherMessages, ...messages]);
  },

  addMessage: (projectId, message) => {
    const { messagesByProject } = get();
    const projectMessages = messagesByProject[projectId] || [];
    const updatedMessages = [...projectMessages, message];

    set({
      messagesByProject: {
        ...messagesByProject,
        [projectId]: updatedMessages
      }
    });

    localDB.insert('codeCraft_messages', message);
  },

  updateMessage: (projectId, messageId, updates) => {
    const { messagesByProject } = get();
    const projectMessages = messagesByProject[projectId] || [];
    const updatedMessages = projectMessages.map(m =>
      m.$id === messageId ? { ...m, ...updates } : m
    );

    set({
      messagesByProject: {
        ...messagesByProject,
        [projectId]: updatedMessages
      }
    });

    localDB.update('codeCraft_messages', messageId, updates);
  },

  deleteMessage: (projectId, messageId) => {
    const { messagesByProject } = get();
    const projectMessages = messagesByProject[projectId] || [];
    const filteredMessages = projectMessages.filter(m => m.$id !== messageId);

    set({
      messagesByProject: {
        ...messagesByProject,
        [projectId]: filteredMessages
      }
    });

    localDB.delete('codeCraft_messages', messageId);
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setError: (error) => set({ error }),

  // Load from LocalDB immediately (instant UI)
  loadFromLocalDB: (projectId: string) => {
    console.log('[MessagesStore] 📂 Loading messages from LocalDB for project:', projectId);
    const allMessages = localDB.getAll<Message>('codeCraft_messages');
    const projectMessages = allMessages
      .filter(m => m.projectId === projectId)
      .sort((a, b) => a.sequence - b.sequence);

    const { messagesByProject } = get();
    set({
      messagesByProject: {
        ...messagesByProject,
        [projectId]: projectMessages
      },
      isLoading: false
    });
    console.log('[MessagesStore] ✅ Loaded', projectMessages.length, 'messages from LocalDB');
  },

  // Sync with Appwrite in background
  syncWithAppwrite: async (projectId: string, userId: string) => {
    console.log('[MessagesStore] 🔄 Starting Appwrite sync for project:', projectId);
    set({ isSyncing: true, error: null });

    try {
      const { createClientSideClient } = await import('@/lib/appwrite/config');
      const { DATABASE_ID, COLLECTIONS } = await import('@/lib/appwrite/config');
      const { Query } = await import('appwrite');
      const { databases } = createClientSideClient();

      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.MESSAGES,
        [
          Query.equal('projectId', projectId),
          Query.orderAsc('sequence'),
          Query.limit(1000) // Get all messages for the project
        ]
      );

      const messages = response.documents as any as Message[];
      console.log('[MessagesStore] 📥 Received', messages.length, 'messages from Appwrite');

      // Update both state and LocalDB
      const { messagesByProject } = get();
      set({
        messagesByProject: {
          ...messagesByProject,
          [projectId]: messages
        },
        isSyncing: false
      });

      // Update LocalDB - replace all messages for this project
      const allMessages = localDB.getAll<Message>('codeCraft_messages');
      const otherMessages = allMessages.filter(m => m.projectId !== projectId);
      localDB.setItems('codeCraft_messages', [...otherMessages, ...messages]);

      console.log('[MessagesStore] ✅ Sync complete - UI and LocalDB updated');

    } catch (error: any) {
      console.error('[MessagesStore] ❌ Appwrite sync failed:', error);
      set({
        error: error.message || 'Failed to sync messages',
        isSyncing: false
      });
    }
  },

  getMessages: (projectId: string) => {
    const { messagesByProject } = get();
    return messagesByProject[projectId] || [];
  },

  clearProjectMessages: (projectId: string) => {
    const { messagesByProject } = get();
    const updatedMap = { ...messagesByProject };
    delete updatedMap[projectId];
    set({ messagesByProject: updatedMap });

    // Clear from LocalDB
    const allMessages = localDB.getAll<Message>('codeCraft_messages');
    const otherMessages = allMessages.filter(m => m.projectId !== projectId);
    localDB.setItems('codeCraft_messages', otherMessages);
  },

  reset: () => {
    set({
      messagesByProject: {},
      isLoading: false,
      isSyncing: false,
      error: null,
    });
  },
}));
