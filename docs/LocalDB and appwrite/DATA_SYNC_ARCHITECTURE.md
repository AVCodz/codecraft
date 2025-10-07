# Data Synchronization Architecture

> **A detailed guide to how data syncing works between LocalDB and Appwrite**

This document explains our dual-storage synchronization system that ensures instant UI updates with LocalDB while keeping data fresh with Appwrite cloud sync.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [The Dual-Storage Pattern](#the-dual-storage-pattern)
3. [Data Flow Diagrams](#data-flow-diagrams)
4. [Implementation by Data Type](#implementation-by-data-type)
5. [Code Examples](#code-examples)
6. [Debugging & Monitoring](#debugging--monitoring)
7. [Best Practices](#best-practices)

---

## Overview

### The Problem We're Solving

In a modern web application, users expect:

- ⚡ **Instant UI updates** - No loading spinners on every page
- 🔄 **Fresh data** - Changes from other devices appear automatically
- 📶 **Offline capability** - App works even with slow/no internet
- 🔒 **Data persistence** - No data loss on page reload

### Our Solution: Dual-Storage Sync Pattern

We use **two storage layers** working together:

1. **LocalDB** (localStorage) - Instant, local, synchronous
2. **Appwrite** (Cloud database) - Persistent, shared, multi-device

```
┌──────────────┐         ┌──────────────┐
│   LocalDB    │ ←────→  │   Appwrite   │
│  (Instant)   │  Sync   │   (Cloud)    │
└──────────────┘         └──────────────┘
       ↓                        ↓
   Fast Reads            Persistent Storage
   Local Cache           Multi-Device Sync
```

---

## The Dual-Storage Pattern

### Core Principle

> **"Load LocalDB first, sync Appwrite in background"**

Every time we need data:

1. ✅ Load from LocalDB instantly → UI updates immediately
2. 🔄 Start Appwrite sync in background → No blocking
3. ✅ When Appwrite returns → Update both UI and LocalDB

### Pattern Flow

```
USER ACTION (Page Load / Navigation)
          ↓
┌─────────────────────────────────┐
│  STEP 1: Load from LocalDB      │
│  (Synchronous, instant)          │
│  ├─ Read from localStorage       │
│  ├─ Update Zustand state         │
│  └─ UI shows data immediately    │
└─────────────────────────────────┘
          ↓
┌─────────────────────────────────┐
│  STEP 2: Sync with Appwrite      │
│  (Asynchronous, background)      │
│  ├─ Fetch from cloud             │
│  ├─ Compare with local data      │
│  └─ If different → merge/update  │
└─────────────────────────────────┘
          ↓
┌─────────────────────────────────┐
│  STEP 3: Update Both Layers      │
│  ├─ Update Zustand state         │
│  └─ Update LocalDB               │
└─────────────────────────────────┘
```

### Visual Timeline

```
Time →
0ms     | Load LocalDB → UI shows data ✅
        |
100ms   | Appwrite API call starts 🔄
        | (UI already showing data)
        |
500ms   | Appwrite returns data 📥
        | Update UI + LocalDB ✅
```

**User Experience**: User sees content at 0ms, not at 500ms!

---

## Data Flow Diagrams

### 1. Dashboard Page Load (Projects)

```
┌─────────────────────────────────────────────────────────┐
│               USER VISITS /dashboard                     │
└────────────────────┬────────────────────────────────────┘
                     ↓
          ┌──────────────────────┐
          │  useEffect() runs    │
          └──────────┬───────────┘
                     ↓
        ┌────────────────────────────┐
        │  loadFromLocalDB()         │
        │  ─────────────────────     │
        │  • Read 'codeCraft_projects'│
        │  • Parse JSON              │
        │  • Update Zustand state    │
        │  • UI renders instantly ✅  │
        └────────────┬───────────────┘
                     │
                     ↓ (simultaneously)
        ┌────────────────────────────┐
        │  syncWithAppwrite()        │
        │  ─────────────────────     │
        │  • Check authentication    │
        │  • Fetch from Appwrite API │
        │  • Filter & sort data      │
        │  • Deduplicate projects    │
        └────────────┬───────────────┘
                     ↓
        ┌────────────────────────────┐
        │  Update Both Layers        │
        │  ─────────────────────     │
        │  • Update Zustand state    │
        │  • Update LocalDB          │
        │  • UI re-renders with      │
        │    fresh data ✅            │
        └────────────────────────────┘
```

### 2. Project Page Load (Messages & Files)

```
┌──────────────────────────────────────────────────────────┐
│         USER VISITS /dashboard/project/my-app             │
└────────────────────┬─────────────────────────────────────┘
                     ↓
          ┌──────────────────────┐
          │  useEffect() runs    │
          └──────────┬───────────┘
                     ↓
    ┌────────────────┴────────────────┐
    ↓                                  ↓
┌────────────────────┐      ┌────────────────────┐
│ Load Messages      │      │ Load Files         │
│ from LocalDB       │      │ from LocalDB       │
│ ✅ Instant          │      │ ✅ Instant          │
└────────────────────┘      └────────────────────┘
    │                                  │
    ↓ (simultaneously)                 ↓ (simultaneously)
┌────────────────────┐      ┌────────────────────┐
│ Sync Messages      │      │ Sync Files         │
│ with Appwrite 🔄   │      │ with Appwrite 🔄   │
└────────────────────┘      └────────────────────┘
    │                                  │
    ↓                                  ↓
┌────────────────────┐      ┌────────────────────┐
│ Update Messages    │      │ Update Files       │
│ in UI + LocalDB ✅  │      │ in UI + LocalDB ✅  │
└────────────────────┘      └────────────────────┘
```

### 3. User Creates New Project

```
┌──────────────────────────────────────────────────────────┐
│         USER CLICKS "CREATE PROJECT" BUTTON               │
└────────────────────┬─────────────────────────────────────┘
                     ↓
          ┌──────────────────────┐
          │  handleCreateProject()│
          └──────────┬───────────┘
                     ↓
        ┌────────────────────────────┐
        │  Create in Appwrite        │
        │  ─────────────────────     │
        │  • Call databases.create   │
        │    Document()              │
        │  • Get new project ID      │
        └────────────┬───────────────┘
                     ↓
        ┌────────────────────────────┐
        │  Update BOTH Layers        │
        │  (Simultaneously)           │
        │  ─────────────────────     │
        │  • addProject() → Zustand  │
        │  • localDB.insert()        │
        │  • UI updates instantly ✅  │
        └────────────┬───────────────┘
                     ↓
        ┌────────────────────────────┐
        │  Navigate to New Project   │
        │  /dashboard/project/slug   │
        └────────────────────────────┘
```

### 4. Background Sync on Reload

```
┌──────────────────────────────────────────────────────────┐
│         USER RELOADS PAGE (Press F5)                      │
└────────────────────┬─────────────────────────────────────┘
                     ↓
          ┌──────────────────────┐
          │  Page Initializes    │
          └──────────┬───────────┘
                     ↓
        ┌────────────────────────────┐
        │  Load from LocalDB         │
        │  (Instant - 0ms)            │
        │  ─────────────────────     │
        │  • Projects: 5 items       │
        │  • Messages: 20 items      │
        │  • Files: 15 items         │
        │  • UI renders ✅            │
        └────────────┬───────────────┘
                     │
                     ↓ (background)
        ┌────────────────────────────┐
        │  Sync with Appwrite        │
        │  (500ms later)              │
        │  ─────────────────────     │
        │  • Check for changes       │
        │  • New project from        │
        │    another device? Yes!    │
        │  • New message? Yes!       │
        └────────────┬───────────────┘
                     ↓
        ┌────────────────────────────┐
        │  Update UI + LocalDB       │
        │  ─────────────────────     │
        │  • Projects: 5 → 6 items   │
        │  • Messages: 20 → 21 items │
        │  • Smooth UI update ✅      │
        └────────────────────────────┘
```

---

## Implementation by Data Type

We manage **three types of data**, each with the same dual-storage pattern:

### 1. Projects 📁

**LocalDB Key**: `codeCraft_projects`
**Appwrite Collection**: `PROJECTS`
**Store**: `useProjectsStore`

#### Data Structure

```javascript
// LocalDB storage format
{
  "items": [
    {
      "$id": "proj_123",
      "userId": "user_456",
      "title": "My Awesome App",
      "slug": "my-awesome-app",
      "framework": "react",
      "status": "active",
      "createdAt": "2025-01-15T10:00:00.000Z",
      "updatedAt": "2025-01-15T15:30:00.000Z",
      "lastMessageAt": "2025-01-15T15:30:00.000Z"
    }
    // ... more projects
  ],
  "lastSync": "2025-01-15T15:30:00.000Z"
}
```

#### Operations

| Operation  | LocalDB         | Appwrite            | Triggered On                 |
| ---------- | --------------- | ------------------- | ---------------------------- |
| **Load**   | ✅ Instant read | 🔄 Background fetch | Dashboard page load          |
| **Create** | ✅ Insert       | ✅ Create document  | User clicks "New Project"    |
| **Update** | ✅ Update       | ✅ Update document  | User edits project           |
| **Delete** | ✅ Remove       | ✅ Delete document  | User deletes project         |
| **Sync**   | ✅ Replace all  | 📥 Fetch all        | Background (every page load) |

---

### 2. Messages 💬

**LocalDB Key**: `codeCraft_messages`
**Appwrite Collection**: `MESSAGES`
**Store**: `useMessagesStore`

#### Data Structure

```javascript
// LocalDB storage format
{
  "items": [
    {
      "$id": "msg_123",
      "projectId": "proj_456",
      "role": "user",
      "content": "Create a button component",
      "sequence": 1,
      "createdAt": "2025-01-15T10:00:00.000Z"
    },
    {
      "$id": "msg_124",
      "projectId": "proj_456",
      "role": "assistant",
      "content": "I'll create a button component for you...",
      "sequence": 2,
      "createdAt": "2025-01-15T10:00:15.000Z"
    }
    // ... more messages
  ],
  "lastSync": "2025-01-15T15:30:00.000Z"
}
```

#### Operations

| Operation  | LocalDB                 | Appwrite              | Triggered On                 |
| ---------- | ----------------------- | --------------------- | ---------------------------- |
| **Load**   | ✅ Filter by projectId  | 🔄 Query by projectId | Project page load            |
| **Create** | ✅ Insert               | ✅ Create document    | User sends message           |
| **Update** | ✅ Update               | ✅ Update document    | AI streams response          |
| **Delete** | ✅ Remove               | ✅ Delete document    | User deletes message         |
| **Sync**   | ✅ Replace project msgs | 📥 Fetch project msgs | Background (every page load) |

#### Key Feature: Per-Project Storage

Messages are stored **globally** in LocalDB but loaded **per-project** in state:

```javascript
// Global LocalDB
codeCraft_messages → [msg1, msg2, msg3, msg4, msg5]

// Zustand state (per-project)
messagesByProject = {
  "proj_123": [msg1, msg2],
  "proj_456": [msg3, msg4, msg5]
}
```

---

### 3. Files 📄

**LocalDB Key**: `codeCraft_files`
**Appwrite Collection**: `PROJECT_FILES`
**Store**: `useFilesStore`

#### Data Structure

```javascript
// LocalDB storage format
{
  "items": [
    {
      "$id": "file_123",
      "projectId": "proj_456",
      "path": "src/App.tsx",
      "type": "file",
      "content": "import React from 'react'...",
      "language": "typescript",
      "createdAt": "2025-01-15T10:00:00.000Z",
      "updatedAt": "2025-01-15T15:30:00.000Z"
    },
    {
      "$id": "file_124",
      "projectId": "proj_456",
      "path": "src/components",
      "type": "directory",
      "content": null,
      "language": null,
      "createdAt": "2025-01-15T10:00:00.000Z"
    }
    // ... more files
  ],
  "lastSync": "2025-01-15T15:30:00.000Z"
}
```

#### Operations

| Operation      | LocalDB                  | Appwrite               | Triggered On                 |
| -------------- | ------------------------ | ---------------------- | ---------------------------- |
| **Load**       | ✅ Filter by projectId   | 🔄 Query by projectId  | Project page load            |
| **Create**     | ✅ Insert                | ✅ Create document     | AI creates file              |
| **Update**     | ✅ Update content        | ✅ Update document     | User edits code              |
| **Delete**     | ✅ Remove                | ✅ Delete document     | User deletes file            |
| **Sync**       | ✅ Replace project files | 📥 Fetch project files | Background (every page load) |
| **Build Tree** | ✅ Generate hierarchy    | -                      | After load/sync              |

#### Key Feature: File Tree Building

Files are stored **flat** but displayed as a **tree**:

```javascript
// Flat storage (LocalDB)
[
  { path: "src/App.tsx", type: "file" },
  { path: "src/components/Button.tsx", type: "file" },
  { path: "src/styles/main.css", type: "file" },
][
  // Tree structure (Zustand state)
  {
    name: "src",
    type: "directory",
    children: [
      { name: "App.tsx", type: "file" },
      {
        name: "components",
        type: "directory",
        children: [{ name: "Button.tsx", type: "file" }],
      },
      {
        name: "styles",
        type: "directory",
        children: [{ name: "main.css", type: "file" }],
      },
    ],
  }
];
```

---

## Code Examples

### Example 1: Loading Projects on Dashboard

**File**: `src/app/dashboard/page.tsx`

```javascript
export default function DashboardPage() {
  const { loadFromLocalDB, syncWithAppwrite } = useProjectsStore();
  const { user } = useAuthStore();

  useEffect(() => {
    // STEP 1: Load LocalDB instantly (synchronous)
    console.log("[Dashboard] 📂 Loading projects from LocalDB...");
    loadFromLocalDB();
    // ↑ UI updates immediately here!

    // STEP 2: Sync with Appwrite in background (asynchronous)
    console.log("[Dashboard] 🔄 Starting background Appwrite sync...");
    checkAuthAndSyncInBackground();
  }, []);

  const checkAuthAndSyncInBackground = async () => {
    try {
      await checkAuth();

      if (user) {
        // This runs in background, doesn't block UI
        await syncWithAppwrite(user.$id);
        console.log("[Dashboard] ✅ Background sync completed");
      }
    } catch (error) {
      console.error("[Dashboard] ❌ Background sync error:", error);
    }
  };

  // ... rest of component
}
```

### Example 2: Creating a New Project

**File**: `src/app/dashboard/page.tsx`

```javascript
const handleCreateProject = async () => {
  try {
    // STEP 1: Create in Appwrite first
    const project = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.PROJECTS,
      ID.unique(),
      {
        userId: user.$id,
        title: newProject.title,
        slug: slug,
        framework: newProject.framework,
        status: "active",
        createdAt: now,
        updatedAt: now,
      }
    );

    // STEP 2: Update BOTH layers simultaneously
    // This updates:
    // ├─ Zustand state (UI updates immediately)
    // └─ LocalDB (persisted for next page load)
    addProject(project);

    // STEP 3: Navigate to new project
    router.push(`/dashboard/project/${slug}`);
  } catch (error) {
    console.error("Error creating project:", error);
  }
};
```

**In Store**: `src/lib/stores/projectsStore.ts`

```javascript
addProject: (project) => {
  const { projects } = get();

  // Check if project already exists (prevent duplicates)
  const existingIndex = projects.findIndex((p) => p.$id === project.$id);

  let newProjects;
  if (existingIndex !== -1) {
    // Update existing project
    newProjects = projects.map((p) => (p.$id === project.$id ? project : p));
  } else {
    // Add new project at the beginning
    newProjects = [project, ...projects];
  }

  // Update Zustand state
  set({ projects: newProjects, totalProjects: newProjects.length });

  // Update LocalDB immediately
  localDB.insert("codeCraft_projects", project);
};
```

### Example 3: Loading Messages for Project

**File**: `src/app/dashboard/project/[slug]/page.tsx`

```javascript
useEffect(() => {
  if (!slug) return;

  // Get project from LocalDB
  const localProject = getProjectBySlug(slug);

  if (localProject) {
    setCurrentProject(localProject);

    // STEP 1: Load messages from LocalDB
    loadMessagesFromLocalDB(localProject.$id);
    loadFilesFromLocalDB(localProject.$id);

    const localMessages = getMessages(localProject.$id);
    const localFiles = getFileTree(localProject.$id);

    // If we have data, show it immediately
    if (localMessages.length > 0 || localFiles.length > 0) {
      setIsInitialLoad(false);

      // STEP 2: Sync with Appwrite in background
      checkAuthAndSyncInBackground(localProject.$id);
    }
  }
}, [slug]);

const checkAuthAndSyncInBackground = async (projectId: string) => {
  try {
    const authResult = await clientAuth.getCurrentUser();
    if (!authResult.success) return;

    // Sync both messages and files in parallel
    await Promise.all([
      syncMessages(projectId, authResult.user.$id),
      syncFiles(projectId),
    ]);

    console.log("[Project] ✅ Background sync completed");
  } catch (error) {
    console.error("[Project] ❌ Background sync failed:", error);
  }
};
```

### Example 4: Syncing Messages with Appwrite

**File**: `src/lib/stores/messagesStore.ts`

```javascript
syncWithAppwrite: async (projectId: string, userId: string) => {
  console.log('[MessagesStore] 🔄 Starting Appwrite sync for project:', projectId);
  set({ isSyncing: true, error: null });

  try {
    // STEP 1: Fetch from Appwrite
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.MESSAGES,
      [
        Query.equal('projectId', projectId),
        Query.orderAsc('sequence'),
        Query.limit(1000)
      ]
    );

    const messages = response.documents as Message[];
    console.log('[MessagesStore] 📥 Received', messages.length, 'messages from Appwrite');

    // STEP 2: Update Zustand state
    const { messagesByProject } = get();
    set({
      messagesByProject: {
        ...messagesByProject,
        [projectId]: messages
      },
      isSyncing: false
    });

    // STEP 3: Update LocalDB
    // Replace all messages for this project, keep others
    const allMessages = localDB.getAll<Message>('codeCraft_messages');
    const otherMessages = allMessages.filter(m => m.projectId !== projectId);
    localDB.setItems('codeCraft_messages', [...otherMessages, ...messages]);

    console.log('[MessagesStore] ✅ Sync complete - UI and LocalDB updated');
  } catch (error) {
    console.error('[MessagesStore] ❌ Appwrite sync failed:', error);
    set({ error: error.message, isSyncing: false });
  }
}
```

---

## Debugging & Monitoring

### Console Logs

Every operation logs to console with prefixes for easy filtering:

#### Filter by Store:

```javascript
// In browser console
// Filter projects logs
// Filter files logs
// Filter messages logs
[ProjectsStore][MessagesStore][FilesStore];
```

#### Example Output:

```
[Dashboard] 📂 Loading projects from LocalDB...
[ProjectsStore] 📂 Loading from LocalDB...
[ProjectsStore] ✅ Loaded 5 projects from LocalDB
[Dashboard] 🔄 Starting background Appwrite sync...
[ProjectsStore] 🔄 Starting Appwrite sync for user: user@example.com
[ProjectsStore] 📥 Received 6 projects from Appwrite
[ProjectsStore] ✨ After deduplication: 6 unique projects
[ProjectsStore] ✅ Sync complete - UI and LocalDB updated
[Dashboard] ✅ Background sync completed
```

### Inspect LocalDB Contents

**In browser console:**

```javascript
// Check projects
console.log(JSON.parse(localStorage.getItem("codeCraft_projects")));

// Check messages
console.log(JSON.parse(localStorage.getItem("codeCraft_messages")));

// Check files
console.log(JSON.parse(localStorage.getItem("codeCraft_files")));

// Check last sync time
const data = JSON.parse(localStorage.getItem("codeCraft_projects"));
console.log("Last sync:", data.lastSync);
```

### Inspect Zustand State

**In browser console:**

```javascript
// Check current projects in state
useProjectsStore.getState().projects;

// Check messages for a project
useMessagesStore.getState().messagesByProject["proj_123"];

// Check if syncing
useProjectsStore.getState().isSyncing;
```

### Monitor Sync Status

**Add to any component:**

```javascript
const { isSyncing: projectsSyncing } = useProjectsStore();
const { isSyncing: messagesSyncing } = useMessagesStore();
const { isSyncing: filesSyncing } = useFilesStore();

console.log("Sync status:", {
  projects: projectsSyncing ? "🔄" : "✅",
  messages: messagesSyncing ? "🔄" : "✅",
  files: filesSyncing ? "🔄" : "✅",
});
```

---

## Best Practices

### 1. Always Load LocalDB First

❌ **Bad** (blocks UI):

```javascript
useEffect(() => {
  // Waits for Appwrite before showing anything
  syncWithAppwrite(userId);
}, []);
```

✅ **Good** (instant UI):

```javascript
useEffect(() => {
  // Load LocalDB first (instant)
  loadFromLocalDB();

  // Sync Appwrite in background
  syncWithAppwrite(userId);
}, []);
```

### 2. Update Both Layers on User Changes

❌ **Bad** (only updates Appwrite):

```javascript
const handleCreateProject = async () => {
  await databases.createDocument(...);
  // ❌ LocalDB not updated!
};
```

✅ **Good** (updates both):

```javascript
const handleCreateProject = async () => {
  const project = await databases.createDocument(...);

  // Update both layers
  addProject(project); // Updates Zustand + LocalDB
};
```

### 3. Use Per-Project Filtering

Messages and files should be filtered by `projectId`:

✅ **Good**:

```javascript
loadFromLocalDB: (projectId: string) => {
  const allMessages = localDB.getAll("codeCraft_messages");

  // Filter for this project only
  const projectMessages = allMessages
    .filter((m) => m.projectId === projectId)
    .sort((a, b) => a.sequence - b.sequence);

  // Store per-project in state
  set({
    messagesByProject: {
      ...messagesByProject,
      [projectId]: projectMessages,
    },
  });
};
```

### 4. Deduplicate on Sync

Always deduplicate when syncing from Appwrite:

✅ **Good**:

```javascript
syncWithAppwrite: async (userId: string) => {
  const projects = response.documents;

  // Deduplicate by $id
  const uniqueProjects = Array.from(
    new Map(projects.map((p) => [p.$id, p])).values()
  );

  set({ projects: uniqueProjects });
  localDB.setItems("codeCraft_projects", uniqueProjects);
};
```

### 5. Handle Sync Failures Gracefully

Don't crash the app if sync fails:

✅ **Good**:

```javascript
syncWithAppwrite: async (userId: string) => {
  try {
    const projects = await databases.listDocuments(...);
    // Update both layers
    set({ projects });
    localDB.setItems('codeCraft_projects', projects);
  } catch (error) {
    console.error('Sync failed:', error);
    // Don't crash! LocalDB data is still available
    set({ error: error.message });
  }
}
```

### 6. Log All Operations

Add descriptive console logs:

✅ **Good**:

```javascript
loadFromLocalDB: () => {
  console.log('[ProjectsStore] 📂 Loading from LocalDB...');
  const projects = localDB.getAll('codeCraft_projects');
  console.log('[ProjectsStore] ✅ Loaded', projects.length, 'projects');
}

syncWithAppwrite: async (userId: string) => {
  console.log('[ProjectsStore] 🔄 Starting Appwrite sync');
  const projects = await databases.listDocuments(...);
  console.log('[ProjectsStore] 📥 Received', projects.length, 'projects');
  console.log('[ProjectsStore] ✅ Sync complete');
}
```

---

## Summary

### Key Takeaways

1. **Dual-Storage Pattern**: LocalDB (instant) + Appwrite (persistent)
2. **Load LocalDB First**: Instant UI, no loading spinners
3. **Sync in Background**: Fresh data without blocking
4. **Update Both Layers**: On user changes, update LocalDB + Appwrite
5. **Per-Project Filtering**: Messages and files filtered by projectId
6. **Deduplication**: Always deduplicate on sync
7. **Comprehensive Logging**: Track every load and sync operation

### Data Flow Summary

```
┌──────────────┐                    ┌──────────────┐
│   LocalDB    │                    │   Appwrite   │
│  (Instant)   │                    │   (Cloud)    │
└──────┬───────┘                    └──────┬───────┘
       │                                   │
       │ ←───── LOAD (0ms) ─────           │
       │                                   │
       │        SYNC (500ms)              │
       │ ─────────────────────────────→   │
       │                                   │
       │ ←────── UPDATE (600ms) ──────────│
       │                                   │
       │                                   │
       │ ──── USER CHANGE ────→            │
       │                       └───────→   │
       │                                   │
```

### Store Methods Reference

| Method               | Purpose                        | When to Use              |
| -------------------- | ------------------------------ | ------------------------ |
| `loadFromLocalDB()`  | Instant load from localStorage | Page load, navigation    |
| `syncWithAppwrite()` | Background sync with cloud     | After load, periodically |
| `addItem()`          | Create new item                | User creates data        |
| `updateItem()`       | Update existing item           | User edits data          |
| `deleteItem()`       | Remove item                    | User deletes data        |
| `setItems()`         | Replace all items              | During sync only         |

---

## Related Documentation

- [Authentication Architecture](./AUTHENTICATION_ARCHITECTURE.md)
- [State Management Architecture](./STATE_MANAGEMENT_ARCHITECTURE.md)

---

**Last Updated**: January 2025
**Maintained By**: CodeCraft AI Team
