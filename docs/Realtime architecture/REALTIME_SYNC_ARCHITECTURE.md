# Realtime Sync Architecture

> **How we handle LocalDB, Appwrite Realtime, and UI synchronization**

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture Components](#architecture-components)
- [Data Flow Patterns](#data-flow-patterns)
- [Implementation Details](#implementation-details)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

---

## Overview

Our application uses a **three-layer synchronization architecture** to ensure instant UI updates, data persistence, and real-time collaboration:

```
┌─────────────────────────────────────────────────────┐
│                   USER INTERFACE                     │
│              (React Components + UI)                 │
└────────────────────┬────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────┐
│              ZUSTAND STORES (State)                  │
│   • filesStore   • messagesStore   • projectsStore  │
└──────┬──────────────────────────────────────┬───────┘
       │                                      │
       ↓                                      ↓
┌──────────────────┐              ┌──────────────────┐
│    LocalDB       │              │     Appwrite     │
│  (localStorage)  │◄────sync────►│  (Cloud + RT)    │
└──────────────────┘              └──────────────────┘
```

### Key Principles

1. **Instant UI Updates**: All user actions update UI immediately via Zustand stores
2. **Local-First**: Read operations prioritize LocalDB for zero latency
3. **Background Sync**: Appwrite syncs happen in the background without blocking UI
4. **Realtime Collaboration**: Appwrite realtime subscriptions keep all clients in sync

---

## Architecture Components

### 1. LocalDB (`/src/lib/localdb/index.ts`)

**Purpose**: Browser-based persistent storage using localStorage

**Features**:
- Fast read/write operations (synchronous)
- Survives page refreshes
- No network latency
- Limited storage (~5-10MB typical)

**Collections**:
```typescript
- codeCraft_projects   // User's projects
- codeCraft_messages   // Chat messages
- codeCraft_files      // Project files
```

**API**:
```typescript
localDB.getAll(collection)           // Get all items
localDB.getById(collection, id)      // Get by ID
localDB.insert(collection, item)     // Insert/upsert item
localDB.update(collection, id, data) // Update item
localDB.delete(collection, id)       // Delete item
localDB.setItems(collection, items)  // Bulk replace
```

---

### 2. Zustand Stores (`/src/lib/stores/`)

**Purpose**: React state management + LocalDB sync layer

**Stores**:
- `filesStore.ts` - Project files state
- `messagesStore.ts` - Chat messages state  
- `projectsStore.ts` - Projects list state
- `projectStore.ts` - Current project UI state
- `syncStore.ts` - Sync metadata and status

**Key Pattern**: Every store method updates **both** Zustand state AND LocalDB:

```typescript
addFile: (projectId, file) => {
  // 1. Update Zustand state (instant UI)
  set({ files: [...files, file] });
  
  // 2. Update LocalDB (persistence)
  localDB.insert("codeCraft_files", file);
}
```

---

### 3. Appwrite Services

#### a) Database (`/src/lib/appwrite/database.ts`)

**⚠️ SERVER-SIDE ONLY**

Used in:
- API routes (`/app/api/**`)
- Server components
- Server actions

**Functions**:
```typescript
createProject(userId, data)
createFile(data)
updateFile(fileId, data)
deleteFile(fileId)
createMessage(data)
// etc.
```

#### b) Realtime Service (`/src/lib/appwrite/realtimeService.ts`)

**Purpose**: Subscribe to Appwrite realtime events

**Functions**:
```typescript
subscribeToProjects(userId, onUpdate)
subscribeToFiles(projectId, { onCreate, onUpdate, onDelete })
subscribeToMessages(projectId, { onCreate, onUpdate, onDelete })
```

**Event Types**:
- `*.create` - Document created
- `*.update` - Document updated
- `*.delete` - Document deleted

---

### 4. Realtime Sync Hook (`/src/lib/hooks/useRealtimeSync.ts`)

**Purpose**: Connect Appwrite realtime to stores

**Flow**:
```typescript
1. Load initial data from Appwrite
2. Populate stores (which update LocalDB)
3. Subscribe to realtime events
4. Update stores on events (which update LocalDB)
```

**Usage**:
```typescript
function ProjectPage({ projectId }) {
  // Automatically syncs project data
  useRealtimeSync(projectId);
  
  // Component renders from stores
  const files = useFilesStore(s => s.getFiles(projectId));
}
```

---

## Data Flow Patterns

### Pattern 1: CREATE Operations

**Example**: User creates a file via AI or UI

```
┌────────────────────────────────────────────────────┐
│ 1. User Action / AI Request                        │
└────────────────┬───────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────┐
│ 2. Create in Appwrite Database                     │
│    await createFile({ projectId, path, content })  │
└────────────────┬───────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────┐
│ 3. Update Store (CRITICAL!)                        │
│    useFilesStore.addFile(projectId, file)          │
│    ├─→ Updates Zustand state (instant UI)          │
│    └─→ Updates LocalDB (persistence)               │
└────────────────┬───────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────┐
│ 4. Appwrite Realtime Event (for other clients)    │
│    Other clients receive event → update their UI   │
└────────────────────────────────────────────────────┘
```

**Code Example**:
```typescript
// ✅ CORRECT - Updates store after Appwrite
async function createFileExecutor(path, content, context) {
  // Step 1: Create in Appwrite
  const file = await createFile({
    projectId: context.projectId,
    userId: context.userId,
    path,
    content,
  });

  // Step 2: Update store (updates LocalDB automatically)
  useFilesStore.getState().addFile(context.projectId, file);
  
  return { success: true, file };
}
```

---

### Pattern 2: UPDATE Operations

**Example**: User edits a file in the code editor

```
┌────────────────────────────────────────────────────┐
│ 1. User Types in Editor                            │
└────────────────┬───────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────┐
│ 2. Update Store Immediately (Instant UI)          │
│    filesStore.updateFile(projectId, fileId, data)  │
│    ├─→ Updates Zustand state                       │
│    └─→ Updates LocalDB                             │
└────────────────┬───────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────┐
│ 3. Debounced Appwrite Update (Background)         │
│    After 1.5s → Update Appwrite database           │
└────────────────┬───────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────┐
│ 4. Realtime Event to Other Clients                │
│    Other users see the updates                     │
└────────────────────────────────────────────────────┘
```

**Code Example**:
```typescript
// In CodeEditor component
const handleContentChange = (newContent: string) => {
  if (!currentProject || !selectedFile) return;
  
  const file = findFileNode(files, selectedFile);
  if (!file) return;

  // Update local store immediately (instant UI)
  projectStore.updateFileContent(selectedFile, newContent);
  
  // Update filesStore (updates LocalDB + triggers Appwrite sync)
  filesStore.updateFile(currentProject.$id, file.id, {
    content: newContent,
    updatedAt: new Date().toISOString(),
  });
};
```

---

### Pattern 3: READ Operations

**Example**: User opens a project page

```
┌────────────────────────────────────────────────────┐
│ 1. Component Mounts                                │
└────────────────┬───────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────┐
│ 2. Load from LocalDB FIRST (Instant UI)           │
│    filesStore.loadFromLocalDB(projectId)           │
│    UI shows data immediately (0ms latency)         │
└────────────────┬───────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────┐
│ 3. Sync with Appwrite in Background               │
│    filesStore.syncWithAppwrite(projectId)          │
│    Fetch latest data from cloud                    │
└────────────────┬───────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────┐
│ 4. Update LocalDB + Store (if data changed)       │
│    UI auto-updates via React re-render             │
└────────────────────────────────────────────────────┘
```

**Code Example**:
```typescript
useEffect(() => {
  if (!project) return;
  
  // Load from LocalDB first (instant)
  filesStore.loadFromLocalDB(project.$id);
  messagesStore.loadFromLocalDB(project.$id);
  
  // Then sync with Appwrite in background
  filesStore.syncWithAppwrite(project.$id);
  messagesStore.syncWithAppwrite(project.$id, user.$id);
}, [project]);
```

---

### Pattern 4: DELETE Operations

**Example**: User deletes a file

```
┌────────────────────────────────────────────────────┐
│ 1. User Confirms Delete                            │
└────────────────┬───────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────┐
│ 2. Delete from Appwrite                            │
│    await deleteFile(fileId)                        │
└────────────────┬───────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────┐
│ 3. Update Store                                    │
│    filesStore.deleteFile(projectId, fileId)        │
│    ├─→ Removes from Zustand state                  │
│    └─→ Removes from LocalDB                        │
└────────────────┬───────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────┐
│ 4. Realtime Event to Other Clients                │
│    Other users see file removed                    │
└────────────────────────────────────────────────────┘
```

---

### Pattern 5: Realtime Collaboration

**Example**: Two users editing same project

```
User A's Browser                  User B's Browser
       ↓                                 ↓
   Creates File                     [No action]
       ↓                                 
   Updates Store                         
   (LocalDB + Appwrite)                  
       ↓                                 
   Appwrite Event ──────────────────→ Receives Event
                                         ↓
                                    Updates Store
                                    (LocalDB updated)
                                         ↓
                                    UI Auto-updates
```

**Flow**:
1. User A performs action → Updates their store → Syncs to Appwrite
2. Appwrite broadcasts realtime event
3. User B's `useRealtimeSync` hook receives event
4. Hook calls store method (e.g., `addFile`)
5. Store updates both Zustand state and LocalDB
6. User B's UI re-renders automatically

---

## Implementation Details

### Store Implementation Pattern

Every store follows this pattern:

```typescript
import { create } from "zustand";
import { localDB } from "@/lib/localdb";
import type { ProjectFile } from "@/lib/types";

interface FilesState {
  filesByProject: Record<string, ProjectFile[]>;
  
  // Actions
  setFiles: (projectId: string, files: ProjectFile[]) => void;
  addFile: (projectId: string, file: ProjectFile) => void;
  updateFile: (projectId: string, fileId: string, updates: Partial<ProjectFile>) => void;
  deleteFile: (projectId: string, fileId: string) => void;
  
  // Sync methods
  loadFromLocalDB: (projectId: string) => void;
  syncWithAppwrite: (projectId: string) => Promise<void>;
}

export const useFilesStore = create<FilesState>((set, get) => ({
  filesByProject: {},

  // Set all files
  setFiles: (projectId, files) => {
    set(state => ({
      filesByProject: { ...state.filesByProject, [projectId]: files }
    }));
    
    // Update LocalDB
    const allFiles = localDB.getAll("codeCraft_files");
    const otherFiles = allFiles.filter(f => f.projectId !== projectId);
    localDB.setItems("codeCraft_files", [...otherFiles, ...files]);
  },

  // Add single file
  addFile: (projectId, file) => {
    const current = get().filesByProject[projectId] || [];
    set(state => ({
      filesByProject: { ...state.filesByProject, [projectId]: [...current, file] }
    }));
    
    // Update LocalDB
    localDB.insert("codeCraft_files", file);
  },

  // Update file
  updateFile: (projectId, fileId, updates) => {
    const current = get().filesByProject[projectId] || [];
    const updated = current.map(f => f.$id === fileId ? { ...f, ...updates } : f);
    
    set(state => ({
      filesByProject: { ...state.filesByProject, [projectId]: updated }
    }));
    
    // Update LocalDB
    localDB.update("codeCraft_files", fileId, updates);
  },

  // Delete file
  deleteFile: (projectId, fileId) => {
    const current = get().filesByProject[projectId] || [];
    const filtered = current.filter(f => f.$id !== fileId);
    
    set(state => ({
      filesByProject: { ...state.filesByProject, [projectId]: filtered }
    }));
    
    // Update LocalDB
    localDB.delete("codeCraft_files", fileId);
  },

  // Load from LocalDB (instant)
  loadFromLocalDB: (projectId) => {
    const allFiles = localDB.getAll<ProjectFile>("codeCraft_files");
    const projectFiles = allFiles.filter(f => f.projectId === projectId);
    
    set(state => ({
      filesByProject: { ...state.filesByProject, [projectId]: projectFiles }
    }));
  },

  // Sync with Appwrite (background)
  syncWithAppwrite: async (projectId) => {
    const { createClientSideClient } = await import("@/lib/appwrite/config");
    const { DATABASE_ID, COLLECTIONS } = await import("@/lib/appwrite/config");
    const { Query } = await import("appwrite");
    
    const { databases } = createClientSideClient();
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECT_FILES,
      [Query.equal("projectId", projectId), Query.limit(5000)]
    );
    
    const files = response.documents as ProjectFile[];
    
    // Update both store and LocalDB
    get().setFiles(projectId, files);
  },
}));
```

---

### Realtime Hook Implementation

```typescript
export function useRealtimeSync(projectId: string | null) {
  const { setFiles, addFile, updateFile, deleteFile } = useFilesStore();
  const { setMessages, addMessage, updateMessage, deleteMessage } = useMessagesStore();

  useEffect(() => {
    if (!projectId) return;

    // 1. Load initial data from Appwrite
    const init = async () => {
      const [files, messages] = await Promise.all([
        realtimeService.getFiles(projectId),
        realtimeService.getMessages(projectId),
      ]);

      setFiles(projectId, files);
      setMessages(projectId, messages);
    };

    init();

    // 2. Subscribe to realtime updates
    const unsubFiles = realtimeService.subscribeToFiles(projectId, {
      onCreate: (file) => addFile(projectId, file),
      onUpdate: (file) => updateFile(projectId, file.$id, file),
      onDelete: (fileId) => deleteFile(projectId, fileId),
    });

    const unsubMessages = realtimeService.subscribeToMessages(projectId, {
      onCreate: (message) => addMessage(projectId, message),
      onUpdate: (message) => updateMessage(projectId, message.$id, message),
      onDelete: (messageId) => deleteMessage(projectId, messageId),
    });

    // 3. Cleanup on unmount
    return () => {
      unsubFiles();
      unsubMessages();
    };
  }, [projectId]);
}
```

---

## Best Practices

### ✅ DO

1. **Always update stores after Appwrite operations**
   ```typescript
   // Create in Appwrite
   const file = await createFile(data);
   
   // Update store (updates LocalDB automatically)
   useFilesStore.getState().addFile(projectId, file);
   ```

2. **Load from LocalDB first for instant UI**
   ```typescript
   useEffect(() => {
     // Instant UI
     filesStore.loadFromLocalDB(projectId);
     
     // Background sync
     filesStore.syncWithAppwrite(projectId);
   }, [projectId]);
   ```

3. **Use stores for all client-side operations**
   ```typescript
   // ✅ Good
   filesStore.addFile(projectId, file);
   
   // ❌ Bad - bypasses LocalDB sync
   const file = await createFile(data);
   ```

4. **Handle offline scenarios gracefully**
   ```typescript
   try {
     await filesStore.syncWithAppwrite(projectId);
   } catch (error) {
     console.warn("Offline - using cached data");
     // LocalDB data still available
   }
   ```

---

### ❌ DON'T

1. **Don't use `database.ts` functions in client code**
   ```typescript
   // ❌ Bad - server-side only
   import { createFile } from "@/lib/appwrite/database";
   await createFile(data);
   ```

2. **Don't forget to update stores after Appwrite operations**
   ```typescript
   // ❌ Bad - LocalDB not updated
   await databases.createDocument(...);
   // Missing: useFilesStore.getState().addFile(...)
   ```

3. **Don't sync to Appwrite without updating LocalDB**
   ```typescript
   // ❌ Bad - UI won't update
   await databases.updateDocument(...);
   // Missing store update
   ```

4. **Don't block UI for Appwrite operations**
   ```typescript
   // ❌ Bad - blocks UI
   await filesStore.syncWithAppwrite(projectId);
   renderUI();
   
   // ✅ Good - async background sync
   filesStore.syncWithAppwrite(projectId);
   renderUI(); // Shows cached data immediately
   ```

---

## Common Patterns

### Pattern: Component Using Files

```typescript
function FileList({ projectId }: { projectId: string }) {
  const files = useFilesStore(s => s.getFiles(projectId));
  const filesStore = useFilesStore();
  
  useEffect(() => {
    // Load from LocalDB first (instant)
    filesStore.loadFromLocalDB(projectId);
    
    // Sync with Appwrite in background
    filesStore.syncWithAppwrite(projectId);
  }, [projectId]);
  
  return (
    <div>
      {files.map(file => (
        <FileItem key={file.$id} file={file} />
      ))}
    </div>
  );
}
```

---

### Pattern: AI Tool Creating File

```typescript
async function createFileExecutor(path, content, context) {
  try {
    // 1. Create in Appwrite
    const file = await createFile({
      projectId: context.projectId,
      userId: context.userId,
      path,
      content,
    });

    // 2. Update store (CRITICAL - updates LocalDB)
    useFilesStore.getState().addFile(context.projectId, file);
    
    // 3. Sync to WebContainer if available
    if (context.webContainer) {
      await context.webContainer.fs.writeFile(path, content);
    }

    return { success: true, file };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

---

### Pattern: User Editing File

```typescript
const CodeEditor = () => {
  const { currentProject, files } = useProjectStore();
  const filesStore = useFilesStore();
  const [content, setContent] = useState("");

  const handleContentChange = (newContent: string) => {
    // 1. Update local UI state immediately
    setContent(newContent);
    
    // 2. Update stores (updates LocalDB)
    filesStore.updateFile(currentProject.$id, file.$id, {
      content: newContent,
      updatedAt: new Date().toISOString(),
    });
    
    // 3. Appwrite sync happens automatically via store
    // (with debouncing if needed)
  };

  return <MonacoEditor value={content} onChange={handleContentChange} />;
};
```

---

### Pattern: WebContainer Sync

```typescript
async function syncWebContainerToAppwrite(container, projectId, userId) {
  // 1. Sync files to Appwrite
  const result = await syncFilesToAppwrite(container, projectId, userId);
  
  // 2. CRITICAL: Update stores to sync LocalDB
  try {
    await useFilesStore.getState().syncWithAppwrite(projectId);
    console.log("✅ Store and LocalDB updated");
  } catch (error) {
    console.warn("⚠️ Failed to update store:", error);
  }
  
  return result;
}
```

---

## Troubleshooting

### Issue: Files not showing in UI after creation

**Symptom**: File created in Appwrite but not visible in UI

**Cause**: Store not updated after Appwrite operation

**Solution**:
```typescript
// After creating file in Appwrite
const file = await createFile(data);

// Add this line:
useFilesStore.getState().addFile(projectId, file);
```

---

### Issue: Changes lost on page refresh

**Symptom**: User edits file but changes disappear after refresh

**Cause**: LocalDB not being updated

**Solution**: Ensure store methods update LocalDB:
```typescript
updateFile: (projectId, fileId, updates) => {
  // Update Zustand
  set({ files: updatedFiles });
  
  // MUST update LocalDB
  localDB.update("codeCraft_files", fileId, updates);
}
```

---

### Issue: Realtime updates not working

**Symptom**: Changes from other users not appearing

**Cause**: 
1. Realtime subscriptions not set up
2. Store not updated on realtime events

**Solution**:
```typescript
// Make sure useRealtimeSync is called
useRealtimeSync(projectId);

// And subscriptions update stores:
subscribeToFiles(projectId, {
  onCreate: (file) => addFile(projectId, file), // ✅ Updates store
  onUpdate: (file) => updateFile(projectId, file.$id, file),
  onDelete: (fileId) => deleteFile(projectId, fileId),
});
```

---

### Issue: Slow UI updates

**Symptom**: UI feels laggy when editing

**Cause**: Waiting for Appwrite before updating UI

**Solution**: Update store immediately, sync to Appwrite in background:
```typescript
// ✅ Good - instant UI update
handleChange(newContent) {
  // Update store immediately
  filesStore.updateFile(projectId, fileId, { content: newContent });
  
  // Appwrite sync happens in background (debounced)
}

// ❌ Bad - waits for network
async handleChange(newContent) {
  await databases.updateDocument(...); // Blocks UI!
  filesStore.updateFile(...);
}
```

---

## File Structure Reference

```
src/
├── lib/
│   ├── localdb/
│   │   └── index.ts              # LocalDB implementation
│   │
│   ├── stores/
│   │   ├── filesStore.ts         # Files state + LocalDB sync
│   │   ├── messagesStore.ts      # Messages state + LocalDB sync
│   │   ├── projectsStore.ts      # Projects state + LocalDB sync
│   │   ├── projectStore.ts       # Current project UI state
│   │   └── syncStore.ts          # Sync metadata
│   │
│   ├── appwrite/
│   │   ├── database.ts           # Server-side database functions
│   │   ├── realtimeService.ts    # Realtime subscriptions
│   │   └── config.ts             # Appwrite configuration
│   │
│   ├── hooks/
│   │   └── useRealtimeSync.ts    # Realtime sync hook
│   │
│   └── utils/
│       ├── localDBSync.ts        # Debug/fallback utilities
│       └── webContainerSync.ts   # WebContainer <-> Appwrite sync
│
└── docs/
    └── REALTIME_SYNC_ARCHITECTURE.md  # This file
```

---

## Summary

### The Golden Rules

1. **UI First**: Always update UI immediately via stores
2. **LocalDB Always**: Every store update must update LocalDB
3. **Appwrite Background**: Sync to Appwrite asynchronously
4. **Realtime Everywhere**: Use `useRealtimeSync` for collaboration
5. **Never Mix**: Client code uses stores, server code uses `database.ts`

### Data Flow Recap

```
USER ACTION
    ↓
ZUSTAND STORE
    ↓
├─→ INSTANT UI UPDATE (React re-render)
└─→ LOCALDB UPDATE (persistence)
    ↓
APPWRITE SYNC (background)
    ↓
REALTIME EVENT (other clients)
    ↓
OTHER CLIENTS' STORES
    ↓
OTHER CLIENTS' UI UPDATES
```

---

**Need help?** Check the store implementations in `/src/lib/stores/` for examples of the correct patterns.

**Found an issue?** Make sure all operations follow the pattern: `Store → LocalDB + Appwrite`
