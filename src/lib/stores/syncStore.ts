import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface SyncStore {
  // Client identification
  clientId: string;
  
  // Connection state
  isOnline: boolean;
  isInitialized: boolean;
  
  // Active subscriptions
  subscriptions: Map<string, () => void>;
  
  // Sync status per collection
  projectsSyncStatus: SyncStatus;
  filesSyncStatus: SyncStatus;
  messagesSyncStatus: SyncStatus;
  
  // Actions
  initializeSync: () => void;
  setOnlineStatus: (status: boolean) => void;
  setSyncStatus: (collection: 'projects' | 'files' | 'messages', status: SyncStatus) => void;
  addSubscription: (key: string, unsubscribe: () => void) => void;
  removeSubscription: (key: string) => void;
  cleanupAllSubscriptions: () => void;
  reset: () => void;
}

// Generate or retrieve client ID
const getClientId = (): string => {
  if (typeof window === 'undefined') return 'server';
  
  let clientId = localStorage.getItem('codecraft_client_id');
  if (!clientId) {
    clientId = crypto.randomUUID();
    localStorage.setItem('codecraft_client_id', clientId);
  }
  return clientId;
};

export const useSyncStore = create<SyncStore>()(
  persist(
    (set, get) => ({
      // Initial state
      clientId: getClientId(),
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isInitialized: false,
      subscriptions: new Map(),
      projectsSyncStatus: 'idle',
      filesSyncStatus: 'idle',
      messagesSyncStatus: 'idle',

      initializeSync: () => {
        if (typeof window === 'undefined') return;
        
        const handleOnline = () => {
          console.log('[Sync] 📡 Connection restored');
          set({ isOnline: true });
        };
        
        const handleOffline = () => {
          console.log('[Sync] 📡 Connection lost');
          set({ isOnline: false });
        };
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        set({ isInitialized: true });
        
        console.log('[Sync] ✅ Initialized with clientId:', get().clientId);
      },

      setOnlineStatus: (status) => {
        set({ isOnline: status });
      },

      setSyncStatus: (collection, status) => {
        const key = `${collection}SyncStatus` as keyof Pick<SyncStore, 'projectsSyncStatus' | 'filesSyncStatus' | 'messagesSyncStatus'>;
        set({ [key]: status });
      },

      addSubscription: (key, unsubscribe) => {
        const { subscriptions } = get();
        const newSubscriptions = new Map(subscriptions);
        newSubscriptions.set(key, unsubscribe);
        set({ subscriptions: newSubscriptions });
        console.log('[Sync] ➕ Added subscription:', key);
      },

      removeSubscription: (key) => {
        const { subscriptions } = get();
        const unsubscribe = subscriptions.get(key);
        if (unsubscribe) {
          unsubscribe();
          const newSubscriptions = new Map(subscriptions);
          newSubscriptions.delete(key);
          set({ subscriptions: newSubscriptions });
          console.log('[Sync] ➖ Removed subscription:', key);
        }
      },

      cleanupAllSubscriptions: () => {
        const { subscriptions } = get();
        console.log('[Sync] 🧹 Cleaning up all subscriptions');
        subscriptions.forEach((unsubscribe, key) => {
          console.log('[Sync] 🧹 Unsubscribing:', key);
          unsubscribe();
        });
        set({ subscriptions: new Map() });
      },

      reset: () => {
        get().cleanupAllSubscriptions();
        set({
          isInitialized: false,
          projectsSyncStatus: 'idle',
          filesSyncStatus: 'idle',
          messagesSyncStatus: 'idle',
        });
      },
    }),
    {
      name: 'codecraft-sync',
      partialize: (state) => ({
        clientId: state.clientId,
      }),
    }
  )
);
