/**
 * MESSAGES STORE - Manages chat messages with LocalDB caching and Appwrite sync
 * 
 * Purpose: Store and sync chat messages per project with instant LocalDB loading
 * Used by: Chat interface, message history, AI conversations
 * Key Features: Per-project messages, LocalDB caching, realtime sync, message CRUD operations
 */

import { create } from "zustand";
import { Message } from "@/lib/types";
import { localDB } from "@/lib/localdb";

interface MessagesState {
  // State
  messagesByProject: Record<string, Message[]>;
  pendingMessages: Set<string>;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;

  // Actions
  setMessages: (projectId: string, messages: Message[]) => void;
  addMessage: (projectId: string, message: Message) => void;
  addOptimisticMessage: (projectId: string, message: Omit<Message, '$id'>) => string;
  updateMessage: (
    projectId: string,
    messageId: string,
    updates: Partial<Message>
  ) => void;
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
  pendingMessages: new Set<string>(),
  isLoading: false,
  isSyncing: false,
  error: null,

  // Actions
  setMessages: (projectId, messages) => {
    const { messagesByProject } = get();
    set({
      messagesByProject: {
        ...messagesByProject,
        [projectId]: messages,
      },
    });

    // Update LocalDB
    const allMessages = localDB.getAll<Message>("codeCraft_messages");
    const otherMessages = allMessages.filter((m) => m.projectId !== projectId);
    localDB.setItems("codeCraft_messages", [...otherMessages, ...messages]);
  },

  addMessage: (projectId, message) => {
    const { messagesByProject, pendingMessages } = get();
    const projectMessages = messagesByProject[projectId] || [];
    
    // Check if this is a real message replacing a pending one
    const pendingToReplace = Array.from(pendingMessages).find(tempId => {
      const tempMsg = projectMessages.find(m => m.$id === tempId);
      return tempMsg && 
             tempMsg.role === message.role && 
             tempMsg.content === message.content &&
             tempMsg.sequence === message.sequence;
    });

    if (pendingToReplace) {
      // Replace pending message with real one
      console.log('[MessagesStore] 🔄 Replacing pending message:', pendingToReplace, '→', message.$id);
      const updatedMessages = projectMessages.map(m => 
        m.$id === pendingToReplace ? message : m
      );
      
      const newPending = new Set(pendingMessages);
      newPending.delete(pendingToReplace);
      
      set({
        messagesByProject: {
          ...messagesByProject,
          [projectId]: updatedMessages,
        },
        pendingMessages: newPending,
      });

      // Update LocalDB
      localDB.delete("codeCraft_messages", pendingToReplace);
      localDB.insert("codeCraft_messages", message);
    } else {
      // Add new message normally
      const updatedMessages = [...projectMessages, message];

      set({
        messagesByProject: {
          ...messagesByProject,
          [projectId]: updatedMessages,
        },
      });

      localDB.insert("codeCraft_messages", message);
    }
  },

  addOptimisticMessage: (projectId, messageData) => {
    const { messagesByProject, pendingMessages } = get();
    const projectMessages = messagesByProject[projectId] || [];
    
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const optimisticMessage: Message = {
      ...messageData,
      $id: tempId,
      $createdAt: new Date().toISOString(),
      $updatedAt: new Date().toISOString(),
      $permissions: [],
      $collectionId: '',
      $databaseId: '',
    } as Message;
    
    console.log('[MessagesStore] ⚡ Adding optimistic message:', tempId);
    
    const updatedMessages = [...projectMessages, optimisticMessage];
    const newPending = new Set(pendingMessages);
    newPending.add(tempId);

    set({
      messagesByProject: {
        ...messagesByProject,
        [projectId]: updatedMessages,
      },
      pendingMessages: newPending,
    });

    localDB.insert("codeCraft_messages", optimisticMessage);
    
    return tempId;
  },

  updateMessage: (projectId, messageId, updates) => {
    const { messagesByProject } = get();
    const projectMessages = messagesByProject[projectId] || [];
    const updatedMessages = projectMessages.map((m) =>
      m.$id === messageId ? { ...m, ...updates } : m
    );

    set({
      messagesByProject: {
        ...messagesByProject,
        [projectId]: updatedMessages,
      },
    });

    localDB.update("codeCraft_messages", messageId, updates);
  },

  deleteMessage: (projectId, messageId) => {
    const { messagesByProject } = get();
    const projectMessages = messagesByProject[projectId] || [];
    const filteredMessages = projectMessages.filter((m) => m.$id !== messageId);

    set({
      messagesByProject: {
        ...messagesByProject,
        [projectId]: filteredMessages,
      },
    });

    localDB.delete("codeCraft_messages", messageId);
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setError: (error) => set({ error }),

  // Load from LocalDB immediately (instant UI)
  loadFromLocalDB: (projectId: string) => {
    console.log(
      "[MessagesStore] 📂 Loading messages from LocalDB for project:",
      projectId
    );
    const allMessages = localDB.getAll<Message>("codeCraft_messages");
    const projectMessages = allMessages
      .filter((m) => m.projectId === projectId)
      .sort((a, b) => a.sequence - b.sequence);

    const { messagesByProject } = get();
    set({
      messagesByProject: {
        ...messagesByProject,
        [projectId]: projectMessages,
      },
      isLoading: false,
    });
    console.log(
      "[MessagesStore] ✅ Loaded",
      projectMessages.length,
      "messages from LocalDB"
    );
  },

  // Sync with Appwrite in background (initial load)
  syncWithAppwrite: async (projectId: string, _userId: string) => {
    console.log(
      "[MessagesStore] 🔄 Starting Appwrite sync for project:",
      projectId
    );
    set({ isSyncing: true, error: null });

    try {
      const { createClientSideClient } = await import("@/lib/appwrite/config");
      const { DATABASE_ID, COLLECTIONS } = await import(
        "@/lib/appwrite/config"
      );
      const { Query } = await import("appwrite");
      const { databases } = createClientSideClient();

      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.MESSAGES,
        [
          Query.equal("projectId", projectId),
          Query.orderAsc("sequence"),
          Query.limit(1000), // Get all messages for the project
        ]
      );

      const messages = response.documents as unknown as Message[];
      console.log(
        "[MessagesStore] 📥 Received",
        messages.length,
        "messages from Appwrite"
      );

      // Update both state and LocalDB
      const { messagesByProject } = get();
      set({
        messagesByProject: {
          ...messagesByProject,
          [projectId]: messages,
        },
        isSyncing: false,
      });

      // Update LocalDB - replace all messages for this project
      const allMessages = localDB.getAll<Message>("codeCraft_messages");
      const otherMessages = allMessages.filter(
        (m) => m.projectId !== projectId
      );
      localDB.setItems("codeCraft_messages", [...otherMessages, ...messages]);

      console.log("[MessagesStore] ✅ Sync complete - UI and LocalDB updated");
    } catch (error: unknown) {
      console.error("[MessagesStore] ❌ Appwrite sync failed:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to sync messages",
        isSyncing: false,
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
    const allMessages = localDB.getAll<Message>("codeCraft_messages");
    const otherMessages = allMessages.filter((m) => m.projectId !== projectId);
    localDB.setItems("codeCraft_messages", otherMessages);
  },

  reset: () => {
    set({
      messagesByProject: {},
      pendingMessages: new Set<string>(),
      isLoading: false,
      isSyncing: false,
      error: null,
    });
  },
}));
