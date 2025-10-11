# Complete Architecture: From User Message to Live Preview

This document explains the complete end-to-end flow of how the application works, from when a user sends a message like "Create a todo app" to seeing the final working project in the preview.

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Phase 1: User Message](#phase-1-user-message)
3. [Phase 2: Frontend Processing](#phase-2-frontend-processing)
4. [Phase 3: API Route & AI Processing](#phase-3-api-route--ai-processing)
5. [Phase 4: Tool Execution](#phase-4-tool-execution)
6. [Phase 5: File Storage](#phase-5-file-storage)
7. [Phase 6: Realtime Updates](#phase-6-realtime-updates)
8. [Phase 7: WebContainer Initialization](#phase-7-webcontainer-initialization)
9. [Phase 8: Build Process](#phase-8-build-process)
10. [Phase 9: Preview Display](#phase-9-preview-display)
11. [Data Flow Diagrams](#data-flow-diagrams)
12. [Technology Stack](#technology-stack)

---

## System Overview

The application is a **full-stack AI-powered code editor** that allows users to:
- Create web projects using natural language
- Edit files in real-time
- Run projects in a browser-based WebContainer
- See live previews without any server deployment

### High-Level Architecture

```
User Input → Frontend → API Route → OpenRouter AI → Tool Execution → 
Appwrite Storage → LocalDB Cache → Zustand Stores → UI Updates → 
WebContainer → npm install → Vite Build → Live Preview
```

---

## Phase 1: User Message

### What Happens
User types a message in the chat interface and clicks send.

**Example:**
```
User: "Create a todo app with React and Tailwind"
```

### Files Involved
- `src/components/chat/ChatInterface.tsx`
- `src/components/chat/MessageInput.tsx`

### Process
1. User types message in `MessageInput` component
2. On submit, message is added to `chatStore` (temporary UI state)
3. Message is sent to `/api/chat` endpoint via `fetch()`

### Code Flow
```typescript
// ChatInterface.tsx
const handleSendMessage = async (content: string) => {
  // Add user message to UI immediately
  addMessage({
    id: generateId(),
    role: "user",
    content,
    timestamp: new Date(),
  });

  // Send to API
  const response = await fetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({
      messages: [...messages, { role: "user", content }],
      projectId,
      userId,
      model: DEFAULT_MODEL,
    }),
  });

  // Handle streaming response...
};
```

---

## Phase 2: Frontend Processing

### What Happens
Frontend handles the streaming response from the API.

### Files Involved
- `src/components/chat/ChatInterface.tsx`
- `src/lib/stores/chatStore.ts`

### Process
1. Frontend receives streaming text response
2. Each chunk is processed and displayed in real-time
3. Tool execution notifications are shown (e.g., "🔨 create_file...")
4. Messages are stored temporarily in `chatStore` for UI

### Code Flow
```typescript
// ChatInterface.tsx - Streaming handler
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  setCurrentStreamingMessage((prev) => prev + chunk);
}
```

### UI Updates
- User sees AI response streaming in real-time
- Tool execution indicators appear
- File creation/update notifications shown

---

## Phase 3: API Route & AI Processing

### What Happens
The API route receives the request and starts the AI tool calling loop.

### Files Involved
- `src/app/api/chat/route.ts` (354 lines)
- `src/lib/ai/openrouter.ts`
- `src/lib/ai/prompts.ts`
- `src/lib/ai/toolDefinitions.ts`

### Process

#### Step 1: Receive Request
```typescript
// route.ts
export async function POST(req: NextRequest) {
  const { messages, projectId, userId, model } = await req.json();
  
  // Get project context
  const project = await getProject(projectId);
  const projectSummary = project?.summary || "New project";
  
  // Get current files
  const files = await getProjectFiles(projectId);
  const projectFilesContext = `Current files: ${files.length}...`;
```

#### Step 2: Prepare Context
```typescript
  // Build system prompt with context
  const conversationMessages = [
    {
      role: "system",
      content: SYSTEM_PROMPT + projectContext,
    },
    {
      role: "user",
      content: lastUserMessage.content,
    },
  ];
```

**System Prompt Includes:**
- Instructions for AI (React, TypeScript, Tailwind)
- Available tools descriptions
- Project structure guidelines
- Best practices
- Current project summary
- List of existing files

#### Step 3: Tool Calling Loop (Max 50 Iterations)
```typescript
  let continueLoop = true;
  let iterationCount = 0;
  const maxIterations = 50;

  while (continueLoop && iterationCount < maxIterations) {
    iterationCount++;

    // 1. Call OpenRouter
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify({
        model, // "x-ai/grok-4-fast"
        messages: conversationMessages,
        tools: toolDefinitions, // 7 file operation tools
        temperature: 0.1,
        topP: 0.9,
      }),
    });

    const data = await response.json();
    const assistantMessage = data.choices[0].message;

    // 2. Stream assistant response
    if (assistantMessage.content) {
      controller.enqueue(encoder.encode(assistantMessage.content));
    }

    // 3. Execute tool calls
    if (assistantMessage.tool_calls) {
      for (const toolCall of assistantMessage.tool_calls) {
        // Execute tool locally
        const result = await executeToolCall(toolCall, { projectId, userId });
        
        // Add result to conversation
        conversationMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result.content,
        });
      }
      continueLoop = true; // Continue loop
    } else {
      continueLoop = false; // No more tools, done
    }
  }
```

### AI Decision Making

The AI (Grok-4-Fast) analyzes the request and decides:
1. **What files to create** (e.g., `/src/App.tsx`, `/src/components/TodoList.tsx`)
2. **What content to write** (full React component code with TypeScript and Tailwind)
3. **What dependencies needed** (updates `package.json`)
4. **Optimal order** (creates files in logical sequence)

---

## Phase 4: Tool Execution

### What Happens
When AI requests a tool (e.g., create_file), it's executed locally.

### Files Involved
- `src/lib/ai/toolExecutor.ts` (450 lines)
- `src/lib/appwrite/database.ts`
- `src/lib/stores/filesStore.ts`

### Available Tools

#### 1. **list_project_files**
Lists all files in the project.

```typescript
// Returns
{
  success: true,
  files: [
    { path: "/src/App.tsx", type: "file", language: "typescript" },
    { path: "/package.json", type: "file", language: "json" },
  ],
  totalFiles: 2
}
```

#### 2. **read_file**
Reads content of a specific file.

```typescript
// Input: { path: "/src/App.tsx" }
// Returns
{
  success: true,
  file: {
    path: "/src/App.tsx",
    content: "import React from 'react'...",
    language: "typescript"
  }
}
```

#### 3. **create_file**
Creates a new file.

```typescript
// Input
{
  path: "/src/components/TodoList.tsx",
  content: "import React from 'react'...",
  description: "Todo list component"
}

// Execution flow:
async function createFileExecutor(path, content, description, context) {
  // 1. Validate path starts with /
  if (!path.startsWith("/")) return { success: false };

  // 2. Check if file already exists
  const files = await getProjectFiles(context.projectId);
  if (files.find(f => f.path === path)) {
    return { success: false, error: "File already exists" };
  }

  // 3. Create in Appwrite database
  const file = await createFile({
    projectId: context.projectId,
    userId: context.userId,
    path,
    type: "file",
    content,
    language: getLanguageFromPath(path),
  });

  // 4. Update stores (which updates LocalDB automatically)
  useFilesStore.getState().addFile(context.projectId, file);

  // 5. Sync to WebContainer if available
  if (context.webContainer) {
    await context.webContainer.fs.writeFile(path, content);
  }

  return { success: true, file };
}
```

#### 4. **update_file**
Updates existing file.

#### 5. **delete_file**
Deletes a file.

#### 6. **search_files**
Fuzzy filename search.

#### 7. **find_in_files**
Content search (grep-like).

### Tool Execution Flow

```
AI requests tool
    ↓
toolExecutor receives request
    ↓
Validate parameters
    ↓
Execute operation in Appwrite
    ↓
Update Zustand stores
    ↓
Update LocalDB (automatic)
    ↓
Sync to WebContainer (if running)
    ↓
Return result to AI
    ↓
AI continues or finishes
```

---

## Phase 5: File Storage

### Three-Layer Storage System

#### Layer 1: Appwrite (Source of Truth)
- **Remote database** in the cloud
- Permanent storage
- Used for persistence across sessions

```typescript
// src/lib/appwrite/database.ts
export async function createFile(data: CreateFileData) {
  const { databases } = createClientSideClient();
  
  return await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.FILES,
    ID.unique(),
    data
  );
}
```

#### Layer 2: LocalDB (Browser Cache)
- **IndexedDB** in browser
- Fast local cache
- Instant access without network

```typescript
// src/lib/localdb/index.ts
class LocalDB {
  insert(key: string, item: unknown) {
    const items = this.getAll(key);
    items.push(item);
    localStorage.setItem(key, JSON.stringify(items));
  }
}

export const localDB = new LocalDB();
```

#### Layer 3: Zustand Stores (UI State)
- **In-memory** state management
- React component updates
- Subscriptions for real-time UI

```typescript
// src/lib/stores/filesStore.ts
export const useFilesStore = create<FilesState>((set, get) => ({
  filesByProject: {}, // { projectId: File[] }

  addFile: (projectId, file) => {
    const files = [...get().filesByProject[projectId], file];
    set({ filesByProject: { ...get().filesByProject, [projectId]: files } });
    
    // Automatically updates LocalDB
    localDB.insert("codecraft_files", file);
  },
}));
```

### Storage Flow

```
Tool creates file
    ↓
1. Save to Appwrite (permanent)
    ↓
2. Update filesStore (in-memory)
    ↓
3. LocalDB updated automatically (cache)
    ↓
4. React components re-render
    ↓
5. UI shows new file instantly
```

---

## Phase 6: Realtime Updates

### What Happens
Appwrite broadcasts changes to all connected clients in real-time.

### Files Involved
- `src/lib/appwrite/realtimeService.ts`
- `src/lib/hooks/useRealtimeSync.ts`

### Process

#### 1. Subscribe to Changes
```typescript
// realtimeService.ts
export async function subscribeToFiles(
  projectId: string,
  callbacks: {
    onCreate?: (file: ProjectFile) => void;
    onUpdate?: (file: ProjectFile) => void;
    onDelete?: (fileId: string) => void;
  }
) {
  const client = createRealtimeClient();
  
  return client.subscribe(
    `databases.${DATABASE_ID}.collections.${COLLECTIONS.FILES}.documents`,
    (response) => {
      const payload = response.payload;
      
      if (payload.projectId !== projectId) return;
      
      if (response.events.includes("create")) {
        callbacks.onCreate?.(payload);
      }
      // ... handle update, delete
    }
  );
}
```

#### 2. React Hook Integration
```typescript
// useRealtimeSync.ts
export function useRealtimeSync(projectId: string) {
  const addFile = useFilesStore(state => state.addFile);
  const updateFile = useFilesStore(state => state.updateFile);
  const deleteFile = useFilesStore(state => state.deleteFile);

  useEffect(() => {
    // Subscribe to file changes
    const unsubscribe = subscribeToFiles(projectId, {
      onCreate: (file) => addFile(projectId, file),
      onUpdate: (file) => updateFile(projectId, file.$id, file),
      onDelete: (fileId) => deleteFile(projectId, fileId),
    });

    return () => unsubscribe();
  }, [projectId]);
}
```

### Realtime Flow

```
File created by AI
    ↓
Appwrite broadcasts event
    ↓
All connected clients receive
    ↓
useRealtimeSync hook handles
    ↓
Zustand store updated
    ↓
React components re-render
    ↓
File appears in file tree immediately
```

---

## Phase 7: WebContainer Initialization

### What Happens
When a project is opened, WebContainer boots and loads files.

### Files Involved
- `src/lib/contexts/WebContainerContext.tsx`
- `src/lib/utils/webContainerSync.ts`
- `src/lib/utils/packageCache.ts`

### Process

#### Step 1: Boot WebContainer
```typescript
// WebContainerContext.tsx
export function WebContainerProvider({ children }) {
  const [webContainer, setWebContainer] = useState<WebContainer | null>(null);
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    async function bootContainer() {
      console.log("[WebContainer] 🚀 Booting...");
      
      const instance = await WebContainer.boot();
      
      console.log("[WebContainer] ✅ Booted successfully");
      setWebContainer(instance);
      setIsBooting(false);
    }

    bootContainer();
  }, []);
}
```

#### Step 2: Load Project Files
```typescript
async function loadProject(projectId: string) {
  // 1. Get files from Appwrite
  const files = await getProjectFiles(projectId);
  
  // 2. Convert to WebContainer format
  const fileTree = convertToFileSystemTree(files);
  
  // 3. Mount to WebContainer
  await webContainer.mount(fileTree);
  
  console.log(`[WebContainer] ✅ Loaded ${files.length} files`);
}

// Example fileTree format:
{
  'package.json': {
    file: { contents: '{"name": "my-app"...}' }
  },
  'src': {
    directory: {
      'App.tsx': {
        file: { contents: 'import React...' }
      }
    }
  }
}
```

#### Step 3: Install Dependencies
```typescript
async function installDependencies() {
  console.log("[WebContainer] 📦 Installing dependencies...");
  
  // Check cache first
  const cacheKey = await getCacheKey(projectId);
  if (await hasValidCache(cacheKey)) {
    console.log("[WebContainer] ✅ Using cached node_modules");
    await restoreCacheToWebContainer(cacheKey, webContainer);
    return;
  }
  
  // Run npm install in WebContainer
  const installProcess = await webContainer.spawn('npm', ['install']);
  
  // Stream output
  const reader = installProcess.output.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    console.log(new TextDecoder().decode(value));
  }
  
  const exitCode = await installProcess.exit;
  
  if (exitCode === 0) {
    console.log("[WebContainer] ✅ Dependencies installed");
    
    // Cache node_modules for next time
    await cacheNodeModules(cacheKey, webContainer);
  } else {
    console.error("[WebContainer] ❌ npm install failed");
  }
}
```

---

## Phase 8: Build Process

### What Happens
Vite builds the project and starts dev server.

### Files Involved
- `src/lib/contexts/WebContainerContext.tsx`

### Process

#### Step 1: Start Dev Server
```typescript
async function startDevServer() {
  console.log("[WebContainer] 🏗️  Starting Vite dev server...");
  
  // Run: npm run dev
  const devProcess = await webContainer.spawn('npm', ['run', 'dev']);
  
  // Stream output and watch for server URL
  devProcess.output.pipeTo(
    new WritableStream({
      write(chunk) {
        const text = new TextDecoder().decode(chunk);
        console.log(text);
        
        // Look for server URL in output
        // Example: "Local: http://localhost:5173"
        const urlMatch = text.match(/Local:\s+(https?:\/\/[^\s]+)/);
        if (urlMatch) {
          setServerUrl(urlMatch[1]);
          console.log(`[WebContainer] ✅ Server ready: ${urlMatch[1]}`);
        }
      }
    })
  );
}
```

#### Step 2: Vite Build Process (Inside WebContainer)
```
1. Vite reads vite.config.ts
2. Processes entry point (index.html)
3. Compiles TypeScript to JavaScript
4. Processes React JSX
5. Applies Tailwind CSS
6. Bundles modules
7. Enables Hot Module Replacement (HMR)
8. Starts dev server on port 5173
9. Returns server URL
```

### Build Output
```
[WebContainer] 📦 Installing dependencies...
✓ Downloaded 237 packages in 2.3s
[WebContainer] ✅ Dependencies installed

[WebContainer] 🏗️  Starting Vite dev server...
  VITE v5.0.0  ready in 432 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
  
[WebContainer] ✅ Server ready: http://localhost:5173/
```

---

## Phase 9: Preview Display

### What Happens
The live preview iframe shows the running application.

### Files Involved
- `src/components/preview/Preview.tsx`

### Process

#### Display Preview
```typescript
// Preview.tsx
export function Preview({ projectId }: PreviewProps) {
  const { serverUrl, isReady } = useWebContainer();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <div className="h-full w-full">
      {!isReady ? (
        <div className="flex items-center justify-center h-full">
          <Spinner />
          <p>Booting WebContainer...</p>
        </div>
      ) : !serverUrl ? (
        <div className="flex items-center justify-center h-full">
          <Spinner />
          <p>Starting dev server...</p>
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          src={serverUrl}
          className="w-full h-full border-0"
          title="Preview"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      )}
    </div>
  );
}
```

### Hot Module Replacement (HMR)
When files are updated:

```
1. File updated in editor
2. Saved to Appwrite/stores
3. Synced to WebContainer
4. Vite detects file change
5. Recompiles only changed module
6. Injects update via HMR
7. Browser updates without refresh
8. Component state preserved
```

---

## Data Flow Diagrams

### Overall System Flow

```
┌─────────────┐
│    User     │
│  "Create    │
│  todo app"  │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  ChatInterface      │
│  - Captures input   │
│  - Sends to API     │
└──────┬──────────────┘
       │
       ▼
┌──────────────────────────────┐
│  /api/chat Route             │
│  - Receives request          │
│  - Prepares context          │
│  - Starts tool calling loop  │
└──────┬───────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  OpenRouter AI (Grok-4-Fast)    │
│  - Analyzes request             │
│  - Decides what files to create │
│  - Requests tools               │
└──────┬──────────────────────────┘
       │
       ▼
┌──────────────────────────┐
│  Tool Executor           │
│  - create_file           │
│  - update_file           │
│  - list_project_files    │
└──────┬───────────────────┘
       │
       ▼
┌────────────────────────────────┐
│  Three-Layer Storage           │
│  1. Appwrite (remote)          │
│  2. LocalDB (cache)            │
│  3. Zustand (in-memory)        │
└──────┬─────────────────────────┘
       │
       ▼
┌──────────────────────────┐
│  Realtime Sync           │
│  - Broadcasts changes    │
│  - Updates all clients   │
└──────┬───────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  WebContainer               │
│  - Boots Node.js in browser │
│  - Loads project files      │
│  - npm install              │
│  - npm run dev (Vite)       │
└──────┬──────────────────────┘
       │
       ▼
┌──────────────────────┐
│  Live Preview        │
│  - Shows in iframe   │
│  - HMR enabled       │
│  - Instant updates   │
└──────────────────────┘
```

### File Creation Flow

```
AI: "I need to create /src/App.tsx"
    ↓
toolExecutor.executeToolCall()
    ↓
createFileExecutor()
    ├─→ 1. Validate path
    ├─→ 2. Check if exists
    ├─→ 3. createFile() → Appwrite
    │      └─→ Stored in remote database
    │
    ├─→ 4. useFilesStore.addFile()
    │      └─→ Updates in-memory state
    │      └─→ Triggers React re-renders
    │
    ├─→ 5. localDB.insert() (automatic)
    │      └─→ Cached in IndexedDB
    │
    └─→ 6. webContainer.fs.writeFile()
           └─→ Written to WebContainer filesystem
    ↓
Return success to AI
    ↓
AI sees success, continues or finishes
```

---

## Technology Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Monaco Editor** - Code editor

### Backend/API
- **Next.js API Routes** - Serverless functions
- **OpenRouter** - AI model routing
- **Grok-4-Fast** - AI model for code generation

### Storage
- **Appwrite** - Backend-as-a-Service
  - Database (PostgreSQL)
  - Realtime subscriptions
  - Authentication
- **IndexedDB (LocalDB)** - Browser cache
- **Zustand with persistence** - In-memory + localStorage

### Build & Runtime
- **WebContainer** - Browser-based Node.js
- **Vite** - Build tool and dev server
- **npm** - Package manager (in WebContainer)

### File Processing
- **7 Custom Tools** - File operations
- **Tool Executor** - Executes AI tool requests
- **Realtime Sync** - Multi-client updates

---

## Performance Optimizations

### 1. **Three-Layer Storage**
- **Instant UI**: Zustand updates → React renders immediately
- **Fast Cache**: LocalDB → no network requests
- **Persistent**: Appwrite → survives browser restart

### 2. **Package Caching**
- First `npm install`: ~30 seconds
- Cached installs: ~2 seconds
- Per-project cache with hash validation

### 3. **Optimistic Updates**
- File creation appears instantly in UI
- Background sync to Appwrite
- Rollback on error

### 4. **Realtime Subscriptions**
- No polling needed
- Instant multi-client sync
- WebSocket-based

### 5. **WebContainer Optimizations**
- Boots once per session
- Reuses Node.js environment
- HMR for instant updates

---

## Error Handling

### File Operations
```typescript
try {
  const file = await createFile(data);
  store.addFile(file); // Optimistic update
} catch (error) {
  store.removeFile(file.id); // Rollback
  showError("Failed to create file");
}
```

### AI Tool Execution
```typescript
// Max 50 iterations to prevent infinite loops
if (iterationCount >= maxIterations) {
  controller.enqueue(encoder.encode("⚠️ Reached max iterations (50)"));
  break;
}

// Handle tool execution errors
if (!result.success) {
  controller.enqueue(encoder.encode(`❌ Error: ${result.error}`));
}
```

### WebContainer Failures
```typescript
// Graceful degradation
if (!webContainer) {
  return <div>WebContainer not available</div>;
}

// Timeout for boot
const bootTimeout = setTimeout(() => {
  setError("WebContainer boot timeout");
}, 30000);
```

---

## Security Considerations

### 1. **Sandbox Isolation**
- WebContainer runs in isolated iframe
- No access to parent window
- Limited filesystem access

### 2. **Authentication**
- Appwrite handles auth
- JWT tokens in cookies
- Session persistence with 7-day expiry

### 3. **Tool Execution**
- Only predefined tools allowed
- Path validation (must start with `/`)
- User/Project ID verification

### 4. **Content Security**
- iframe sandbox attributes
- No eval() or unsafe code execution
- Sanitized user inputs

---

## Debugging

### Useful Console Logs
```typescript
// Enable in development
localStorage.setItem('DEBUG', 'true');

// Tool execution
console.log('[ToolExecutor] 🔧 Executing', toolName);

// File operations
console.log('[FilesStore] ✅ File added:', file.path);

// WebContainer
console.log('[WebContainer] 🚀 Booting...');
console.log('[WebContainer] ✅ Server ready:', serverUrl);

// Realtime
console.log('[Realtime] 📡 File created:', file.path);
```

### Debug Tools (Browser Console)
```javascript
// Check stores
window.debug = {
  files: useFilesStore.getState(),
  projects: useProjectsStore.getState(),
  auth: useAuthStore.getState(),
};

// Check LocalDB
localDB.getAll('codecraft_files');

// Check WebContainer
webContainer.fs.readdir('/src');
```

---

## Conclusion

This architecture provides:
- ✅ **Instant feedback** - Three-layer storage for immediate UI updates
- ✅ **Real-time collaboration** - Appwrite realtime subscriptions
- ✅ **No backend deployment** - WebContainer runs entirely in browser
- ✅ **Smart AI assistance** - OpenRouter with 50-iteration tool calling
- ✅ **Persistent storage** - Appwrite for permanent file storage
- ✅ **Fast builds** - Vite with HMR for instant updates
- ✅ **Scalable** - Optimistic updates, caching, parallel operations

The result is a fully functional AI-powered code editor that feels instant and works entirely in the browser with no server deployment needed.
