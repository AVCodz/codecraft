# State Management Architecture

## Overview

Our application uses a **three-tier state management system** that provides instant UI updates, offline capability, and real-time synchronization across clients.

```
┌─────────────┐
│     UI      │ ← Instant updates via Zustand subscriptions
├─────────────┤
│   Zustand   │ ← In-memory state management
├─────────────┤
│   LocalDB   │ ← Browser localStorage cache (instant load)
├─────────────┤
│  Appwrite   │ ← Remote database (source of truth)
└─────────────┘
       ↕
  Realtime WS  ← WebSocket for live updates
```

## The Three Tiers

### 1. Zustand Stores (In-Memory State)
- **Purpose**: React state management with subscriptions
- **Location**: `src/lib/stores/`
- **Key Stores**:
  - `authStore.ts` - User authentication state
  - `filesStore.ts` - Project files (per-project)
  - `messagesStore.ts` - Chat messages (per-project)
  - `projectStore.ts` - Current project editor state
  - `projectsStore.ts` - All user projects list
  - `uiStore.ts` - UI preferences and state

**Why Zustand?**
- Minimal boilerplate
- React hooks integration
- Built-in persistence middleware
- Selective re-rendering

### 2. LocalDB (Browser Cache)
- **Purpose**: Instant initial load + offline capability
- **Location**: `src/lib/localdb/index.ts`
- **Storage**: Browser localStorage
- **Collections**:
  - `codeCraft_projects` - User projects
  - `codeCraft_messages` - Chat history
  - `codeCraft_files` - Project files

**Structure**:
```typescript
interface StorageData<T> {
  items: T[];
  lastSync: string; // ISO timestamp of last sync
}
```

### 3. Appwrite (Remote Database)
- **Purpose**: Source of truth + cross-device sync
- **Collections**:
  - `users_profiles` - User profiles
  - `projects` - Projects metadata
  - `files` - Project files
  - `messages` - Chat messages

## Data Flow

### 1. Initial Load (App Start)

```
User Opens App
      ↓
┌─────────────────────────────────┐
│ 1. AuthStore initializes        │
│    - Loads from Zustand persist │
│    - Restores from LocalDB      │
└─────────────────────────────────┘
      ↓
┌─────────────────────────────────┐
│ 2. ProjectsStore.loadFromLocalDB│
│    - Instant UI population      │
│    - Shows cached projects      │
└─────────────────────────────────┘
      ↓
┌─────────────────────────────────┐
│ 3. Background Appwrite Sync     │
│    - Fetch latest from server   │
│    - Update LocalDB cache       │
│    - Update Zustand store       │
│    - UI re-renders with latest  │
└─────────────────────────────────┘
```

**Code Example** (`projectsStore.ts`):
```typescript
// Initial load from LocalDB (instant)
loadFromLocalDB: () => {
  const cached = localDB.getAll<Project>('codeCraft_projects');
  set({ 
    projects: cached,
    lastSyncedAt: localDB.getLastSync('codeCraft_projects')
  });
}

// Background sync with Appwrite
syncWithAppwrite: async (userId: string) => {
  const projects = await getAllUserProjects(userId);
  
  // Update LocalDB
  localDB.saveAll('codeCraft_projects', projects);
  
  // Update Zustand (triggers UI update)
  set({ 
    projects,
    lastSyncedAt: new Date().toISOString()
  });
}
```

### 2. File Operations (Create/Update/Delete)

```
User Creates/Edits File
      ↓
┌─────────────────────────────────┐
│ 1. AI Tool Executor runs        │
│    - createFile/updateFile      │
└─────────────────────────────────┘
      ↓
┌─────────────────────────────────┐
│ 2. Appwrite API Call            │
│    - Write to remote database   │
│    - Returns created/updated doc│
└─────────────────────────────────┘
      ↓
┌─────────────────────────────────┐
│ 3. Update Zustand Store         │
│    - filesStore.addFile()       │
│    - filesStore.updateFile()    │
│    - Rebuilds file tree         │
└─────────────────────────────────┘
      ↓
┌─────────────────────────────────┐
│ 4. Persist to LocalDB           │
│    - localDB.upsert()           │
│    - Update lastSync timestamp  │
└─────────────────────────────────┘
      ↓
┌─────────────────────────────────┐
│ 5. Realtime Broadcast           │
│    - Appwrite sends WebSocket   │
│    - Other clients receive event│
└─────────────────────────────────┘
```

**Code Example** (`toolExecutor.ts`):
```typescript
async function createFileExecutor(path: string, content: string, context) {
  // 1. Write to Appwrite
  const file = await createFile({
    projectId: context.projectId,
    path,
    content,
    type: getTypeFromPath(path),
    language: getLanguageFromPath(path)
  });

  // 2. Update Zustand store
  const filesStore = useFilesStore.getState();
  filesStore.addFile(context.projectId, file);

  // 3. LocalDB auto-updates via store subscription
  // (handled in store's addFile method)
  
  return { success: true, file };
}
```

### 3. Real-time Synchronization

```
Other Client Creates File
      ↓
┌─────────────────────────────────┐
│ 1. Appwrite Realtime Event      │
│    - WebSocket push             │
│    - Event: databases.*.create  │
└─────────────────────────────────┘
      ↓
┌─────────────────────────────────┐
│ 2. useRealtimeSync Hook         │
│    - Receives event             │
│    - Parses payload             │
└─────────────────────────────────┘
      ↓
┌─────────────────────────────────┐
│ 3. Update Zustand Store         │
│    - filesStore.addFile()       │
│    - Triggers UI re-render      │
└─────────────────────────────────┘
      ↓
┌─────────────────────────────────┐
│ 4. LocalDB Auto-sync            │
│    - Store updates LocalDB      │
│    - Cache stays fresh          │
└─────────────────────────────────┘
```

**Code Example** (`useRealtimeSync.ts`):
```typescript
// Subscribe to file changes
const unsubFiles = realtimeService.subscribeToFiles(projectId, {
  onCreate: (file) => {
    console.log('[Realtime] ➕ File created:', file.path);
    addFile(projectId, file);
    // File tree rebuild automatic in addFile
  },
  onUpdate: (file) => {
    console.log('[Realtime] 🔄 File updated:', file.path);
    updateFile(projectId, file.$id, file);
  },
  onDelete: (fileId) => {
    console.log('[Realtime] ❌ File deleted:', fileId);
    deleteFile(projectId, fileId);
    rebuildFileTree();
  },
});
```

## Per-Project State Isolation

Files and messages are stored **per-project** to avoid conflicts:

```typescript
interface FilesState {
  filesByProject: Record<string, ProjectFile[]>;
  fileTreeByProject: Record<string, FileNode[]>;
}

// Get files for specific project
getFiles: (projectId: string) => ProjectFile[] => {
  return get().filesByProject[projectId] || [];
}
```

This ensures:
- Clean state separation
- Efficient memory usage (only load active project)
- Easy project switching

## Sync Metadata Tracking

Each file has sync status tracking:

```typescript
interface FileSyncMeta {
  status: "synced" | "syncing" | "error";
  lastSyncedAt: Date | null;
  hasLocalChanges: boolean;
  errorMessage?: string;
}
```

**Usage**:
- Show loading spinners during sync
- Detect unsaved changes
- Handle offline editing
- Retry failed syncs

## Store Methods Pattern

All stores follow this pattern:

```typescript
export const useFilesStore = create<FilesState>((set, get) => ({
  // State
  filesByProject: {},
  isLoading: false,
  
  // LocalDB methods
  loadFromLocalDB: (projectId) => {
    const cached = localDB.query('codeCraft_files', 
      (item) => item.projectId === projectId
    );
    set({ filesByProject: { [projectId]: cached } });
  },
  
  // Appwrite sync methods
  syncWithAppwrite: async (projectId) => {
    const files = await getProjectFiles(projectId);
    
    // Update LocalDB
    localDB.upsertMany('codeCraft_files', files);
    
    // Update Zustand
    set({ filesByProject: { [projectId]: files } });
  },
  
  // CRUD methods
  addFile: (projectId, file) => {
    const current = get().filesByProject[projectId] || [];
    const updated = [...current, file];
    
    // Update Zustand
    set({ 
      filesByProject: { 
        ...get().filesByProject,
        [projectId]: updated 
      }
    });
    
    // Update LocalDB
    localDB.upsert('codeCraft_files', file, (f) => f.$id === file.$id);
  }
}));
```

## UI Integration

Components subscribe to stores via hooks:

```typescript
function CodeEditor() {
  // Subscribe to specific project's files
  const files = useFilesStore(state => 
    state.getFiles(projectId)
  );
  
  const fileTree = useFilesStore(state =>
    state.getFileTree(projectId)
  );
  
  // Only re-renders when files or fileTree change
  return <div>{/* render files */}</div>;
}
```

## Realtime Service Architecture

**Location**: `src/lib/appwrite/realtimeService.ts`

```typescript
class RealtimeService {
  // Subscribe to file changes for a project
  subscribeToFiles(projectId: string, handlers: {
    onCreate: (file: ProjectFile) => void;
    onUpdate: (file: ProjectFile) => void;
    onDelete: (fileId: string) => void;
  }) {
    const client = createClientSideClient().client;
    
    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.${COLLECTIONS.FILES}.documents`,
      (response) => {
        const { events, payload } = response;
        
        if (payload.projectId !== projectId) return;
        
        if (events.includes('create')) {
          handlers.onCreate(payload);
        } else if (events.includes('update')) {
          handlers.onUpdate(payload);
        } else if (events.includes('delete')) {
          handlers.onDelete(payload.$id);
        }
      }
    );
    
    return unsubscribe; // Cleanup function
  }
}
```

## Benefits of This Architecture

### 1. **Instant UI**
- LocalDB loads in ~1ms
- No loading spinners on app start
- Users see data immediately

### 2. **Offline Capability**
- Full app works offline
- Changes queued for sync
- Auto-sync when online

### 3. **Real-time Collaboration**
- WebSocket updates
- Multiple users can edit
- Changes appear instantly

### 4. **Reliability**
- Three layers of data persistence
- Automatic retry logic
- Graceful degradation

### 5. **Performance**
- Selective re-rendering (Zustand)
- Minimal network requests
- Efficient memory usage

## Common Patterns

### Pattern 1: Load on Mount
```typescript
useEffect(() => {
  // 1. Load from LocalDB (instant)
  filesStore.loadFromLocalDB(projectId);
  
  // 2. Sync with Appwrite (background)
  filesStore.syncWithAppwrite(projectId);
}, [projectId]);
```

### Pattern 2: Optimistic Updates
```typescript
async function saveFile(file: ProjectFile) {
  // 1. Update UI immediately
  filesStore.updateFile(projectId, file.$id, file);
  
  try {
    // 2. Persist to Appwrite
    await updateFileInAppwrite(file);
    filesStore.setFileSyncStatus(file.$id, 'synced');
  } catch (error) {
    // 3. Rollback on error
    filesStore.setFileSyncStatus(file.$id, 'error');
  }
}
```

### Pattern 3: Realtime Subscription Lifecycle
```typescript
useEffect(() => {
  if (!projectId) return;
  
  // Subscribe
  const unsubscribe = realtimeService.subscribeToFiles(
    projectId, 
    handlers
  );
  
  // Cleanup on unmount
  return () => unsubscribe();
}, [projectId]);
```

## Troubleshooting

### Issue: Stale Data in UI
**Solution**: Check sync order
```typescript
// ✅ Correct: Zustand → LocalDB
filesStore.addFile(projectId, file); // Triggers UI update
localDB.upsert('codeCraft_files', file); // Persists cache

// ❌ Wrong: LocalDB → Zustand
localDB.upsert('codeCraft_files', file); // No UI update
filesStore.loadFromLocalDB(projectId); // Forces reload
```

### Issue: Memory Leaks
**Solution**: Always cleanup subscriptions
```typescript
useEffect(() => {
  const unsub = realtimeService.subscribe(...);
  return () => unsub(); // CRITICAL
}, []);
```

### Issue: Sync Conflicts
**Solution**: Use timestamps
```typescript
// Appwrite doc has $updatedAt
if (localFile.$updatedAt < remoteFile.$updatedAt) {
  // Remote is newer, use it
  filesStore.updateFile(projectId, remoteFile.$id, remoteFile);
}
```

## Summary

Our state management follows this golden rule:

**LocalDB for speed, Appwrite for truth, Zustand for reactivity**

This architecture gives us:
- **Instant** UI updates (Zustand)
- **Fast** initial loads (LocalDB)
- **Reliable** persistence (Appwrite)
- **Real-time** collaboration (WebSocket)
