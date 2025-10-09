# Realtime Fix - Create/Update/Delete Events

## Problem

When creating a new project and initializing files, the files weren't appearing in realtime because:

1. **Old implementation** only handled generic "updates"
2. When files were **created**, the hook called `updateFile()` which only updates existing files
3. New files were ignored because they didn't exist in the store yet

## Solution

Updated the realtime service to distinguish between **create**, **update**, and **delete** events:

### Changes Made

#### 1. `realtimeService.ts`

Changed from single callback to event-specific callbacks:

**Before:**
```typescript
subscribeToFiles(projectId, (file) => {
  updateFile(file); // ❌ Won't add new files!
})
```

**After:**
```typescript
subscribeToFiles(projectId, {
  onCreate: (file) => addFile(file),      // ✅ Handles new files
  onUpdate: (file) => updateFile(file),    // ✅ Handles edits
  onDelete: (fileId) => deleteFile(fileId) // ✅ Handles deletions
})
```

#### 2. `useRealtimeSync.ts`

Now properly handles all three event types:

```typescript
const unsubFiles = realtimeService.subscribeToFiles(projectId, {
  onCreate: (file) => {
    console.log('[Realtime] ➕ File created:', file.path);
    addFile(projectId, file);
    rebuildFileTree();
  },
  onUpdate: (file) => {
    console.log('[Realtime] 🔄 File updated:', file.path);
    updateFile(projectId, file.$id, file);
    rebuildFileTree();
  },
  onDelete: (fileId) => {
    console.log('[Realtime] ❌ File deleted:', fileId);
    deleteFile(projectId, fileId);
    rebuildFileTree();
  },
});
```

Same pattern for messages.

---

## How It Works Now

### 1. New Project Created

```
AI creates files via API
    ↓
Appwrite broadcasts "create" events
    ↓
Realtime detects event type: ".create"
    ↓
Calls onCreate callback
    ↓
addFile() adds to store
    ↓
File tree rebuilds
    ↓
UI updates! ✅
```

### 2. File Edited

```
User edits file
    ↓
Save to Appwrite
    ↓
Broadcast "update" event
    ↓
onUpdate callback
    ↓
updateFile() modifies existing
    ↓
File tree rebuilds
    ↓
UI updates! ✅
```

### 3. File Deleted

```
User deletes file
    ↓
Delete from Appwrite
    ↓
Broadcast "delete" event
    ↓
onDelete callback
    ↓
deleteFile() removes from store
    ↓
File tree rebuilds
    ↓
UI updates! ✅
```

---

## Testing

### Test 1: New Project Creation
1. Create a new project
2. Wait for AI to initialize files
3. **Expected**: Files appear in file tree in realtime
4. **Check console**: Should see `[Realtime] ➕ File created: /src/App.tsx`

### Test 2: File Editing
1. Open a file
2. Edit content and save
3. **Expected**: Changes appear immediately
4. **Check console**: Should see `[Realtime] 🔄 File updated: /src/App.tsx`

### Test 3: Multi-Window
1. Open project in two windows
2. Create file in window A
3. **Expected**: File appears in window B instantly
4. **Both windows**: See create event in console

---

## Console Logs

With the fix, you'll see helpful logs:

```
[Realtime] ➕ File created: /src/App.tsx
[Realtime] ➕ File created: /src/index.html
[Realtime] ➕ File created: /package.json
[Realtime] 🔄 File updated: /src/App.tsx
[Realtime] ❌ File deleted: /src/temp.txt
```

These help debug realtime sync issues.

---

## Summary

✅ **Fixed**: New files now appear in realtime
✅ **Fixed**: Updated files sync correctly  
✅ **Fixed**: Deleted files removed properly
✅ **Added**: Console logs for debugging
✅ **Added**: Proper event type detection

**Result**: Realtime sync now works for all CRUD operations! 🎉
