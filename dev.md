# CodeCraft AI - Low Level Design Document

**Version:** 1.0.0  
**Last Updated:** January 2025  
**Project:** CodeCraft AI - AI-Powered Code Editor Platform

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Core Components](#3-core-components)
4. [State Management](#4-state-management)
5. [Authentication System](#5-authentication-system)
6. [AI Integration](#6-ai-integration)
7. [Real-time Synchronization](#7-real-time-synchronization)
8. [WebContainer Integration](#8-webcontainer-integration)
9. [API Design](#9-api-design)
10. [Database Schema](#10-database-schema)
11. [File System Management](#11-file-system-management)
12. [Code Editor Integration](#12-code-editor-integration)
13. [Terminal Integration](#13-terminal-integration)
14. [Security](#14-security)
15. [Performance Optimizations](#15-performance-optimizations)
16. [Error Handling](#16-error-handling)
17. [Testing Strategy](#17-testing-strategy)

---

## 1. System Overview

### 1.1 Purpose
CodeCraft AI is a browser-based AI-powered code editor that enables users to build, edit, and preview full-stack applications in real-time with AI assistance. The system provides instant code generation, live preview, terminal access, and collaborative features.

### 1.2 Technology Stack

#### Frontend
- **Framework**: Next.js 15 with App Router + Turbopack
- **UI Library**: React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand 5 + Nanostores
- **Code Editor**: Monaco Editor 0.54
- **Terminal**: XTerm.js 5.5
- **UI Components**: Radix UI + Custom Components
- **Animation**: Framer Motion 12

#### Backend Services
- **BaaS**: Appwrite (Database, Auth, Realtime, Storage)
- **AI Provider**: OpenRouter (Gemini 2.0 Flash)
- **AI SDK**: Vercel AI SDK 5.0

#### Runtime Environment
- **WebContainer**: StackBlitz WebContainer API 1.6
- **File Bundling**: JSZip 3.10

### 1.3 Key Features
- 🤖 AI-powered code generation and editing
- 📝 Monaco-based code editor with IntelliSense
- 🖥️ Live preview with responsive design testing
- 💻 Integrated terminal with WebContainer
- 🔄 Real-time collaboration via WebSocket
- 💾 Multi-layer persistence (Zustand + LocalDB + Appwrite)
- 🔐 Secure authentication with session management
- 📦 Project export as ZIP
- 🌳 File tree navigation with CRUD operations

---

## 2. Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│  Next.js App Router + React Components + Monaco Editor          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                   CLIENT-SIDE STATE LAYER                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Zustand    │  │   LocalDB    │  │ WebContainer │         │
│  │   Stores     │  │  (localStorage)│  │   Instance   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER (Next.js)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Auth Routes │  │Project APIs │  │  Chat API   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ↓                               ↓
┌─────────────────────────┐    ┌─────────────────────────┐
│   APPWRITE BACKEND      │    │   AI SERVICES           │
│  ┌──────────────────┐   │    │  ┌──────────────────┐   │
│  │   Database       │   │    │  │   OpenRouter     │   │
│  │   Authentication │   │    │  │   (Gemini 2.0)   │   │
│  │   Realtime       │   │    │  │   Tool Calling   │   │
│  │   Storage        │   │    │  └──────────────────┘   │
│  └──────────────────┘   │    └─────────────────────────┘
└─────────────────────────┘
```

### 2.2 Three-Tier State Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      TIER 1: ZUSTAND                            │
│  • In-memory state management                                   │
│  • React component subscriptions                                │
│  • Instant UI updates (< 1ms)                                   │
│  • Lost on page refresh                                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    TIER 2: LOCALDB                              │
│  • Browser localStorage cache                                   │
│  • Instant load on page refresh (1-5ms)                         │
│  • Offline capability                                           │
│  • Per-browser persistence                                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    TIER 3: APPWRITE                             │
│  • Remote database (source of truth)                            │
│  • Cross-device synchronization                                 │
│  • Real-time WebSocket updates                                  │
│  • Persistent storage                                           │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Data Flow Patterns

#### Read Flow (Fast Path)
```
App Load → LocalDB Check (1ms) → Zustand Update → UI Render
                    ↓
          Background Appwrite Sync → LocalDB Update → Zustand Update
```

#### Write Flow (Reliable Path)
```
User Action → API Request → Appwrite Write → Response
                                    ↓
                          Zustand Update → UI Update
                                    ↓
                          LocalDB Cache Update
                                    ↓
                    Realtime Broadcast to Other Clients
```

#### Realtime Update Flow (Collaborative Path)
```
Other Client → Appwrite Change → WebSocket Event
                                        ↓
                              Realtime Service Handler
                                        ↓
                              Zustand Store Update
                                        ↓
                              LocalDB Cache Update
                                        ↓
                                    UI Update
```

---

## 3. Core Components

### 3.1 Component Hierarchy

```
app/
├── layout.tsx                      # Root layout with providers
├── page.tsx                        # Landing page
├── login/page.tsx                  # Login page
├── register/page.tsx               # Registration page
├── dashboard/page.tsx              # User dashboard
└── [projectId]/page.tsx           # Project editor workspace

components/
├── auth/
│   ├── AuthProvider.tsx           # Auth context provider
│   ├── AuthGuard.tsx              # Route protection
│   ├── SessionInitializer.tsx     # Session restoration
│   ├── LoginForm.tsx              # Login UI
│   └── RegisterForm.tsx           # Registration UI
├── editor/
│   ├── CodeEditor.tsx             # Monaco editor wrapper
│   ├── FileTree.tsx               # File navigation tree
│   └── FileTreeNode.tsx           # Individual tree node
├── preview/
│   ├── Preview.tsx                # Live preview iframe
│   └── PreviewToolbar.tsx         # Preview controls
├── terminal/
│   └── Terminal.tsx               # XTerm.js integration
├── chat/
│   ├── ChatInterface.tsx          # Main chat UI
│   ├── MessageList.tsx            # Message display
│   ├── MessageInput.tsx           # User input
│   └── StreamingMessage.tsx       # AI response streaming
├── project/
│   └── WebContainerInitializer.tsx # WebContainer setup
└── ui/
    ├── Button.tsx
    ├── Input.tsx
    ├── Dialog.tsx
    ├── Dropdown.tsx
    └── layout/
        ├── Navbar.tsx
        └── Footer.tsx
```

### 3.2 Component Communication

```
┌──────────────────────────────────────────────────────────────┐
│                      Parent Container                        │
│                  [projectId]/page.tsx                        │
└──────────┬──────────────────┬──────────────────┬────────────┘
           │                  │                  │
           ↓                  ↓                  ↓
    ┌────────────┐    ┌────────────┐    ┌────────────┐
    │   Editor   │    │  Preview   │    │  Terminal  │
    │ Component  │    │ Component  │    │ Component  │
    └─────┬──────┘    └─────┬──────┘    └─────┬──────┘
          │                 │                  │
          └────────┬────────┴─────────┬────────┘
                   │                  │
                   ↓                  ↓
            ┌────────────┐    ┌────────────┐
            │   Zustand  │    │ WebContainer│
            │   Stores   │    │   Context   │
            └────────────┘    └────────────┘
```

---

## 4. State Management

### 4.1 Zustand Stores

#### 4.1.1 Auth Store (`authStore.ts`)
```typescript
interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}
```

**Responsibilities:**
- User authentication state
- Session management
- Cookie-based session backup
- LocalDB user cache

**Key Methods:**
- `checkSession()`: Validates session on app load
- `login()`: Authenticates user and creates session
- `logout()`: Clears session and redirects

#### 4.1.2 Projects Store (`projectsStore.ts`)
```typescript
interface ProjectsState {
  // State
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  
  // Actions
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  createProject: (data: CreateProjectData) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  loadFromLocalDB: () => void;
  syncWithAppwrite: () => Promise<void>;
}
```

**Responsibilities:**
- Project list management
- Current project state
- CRUD operations with Appwrite
- LocalDB caching

#### 4.1.3 Files Store (`filesStore.ts`)
```typescript
interface FilesState {
  // State
  filesByProject: Record<string, ProjectFile[]>;
  fileTreeByProject: Record<string, FileNode[]>;
  syncMetadata: Map<string, FileSyncMeta>;
  
  // Actions
  setFiles: (projectId: string, files: ProjectFile[]) => void;
  addFile: (projectId: string, file: ProjectFile) => void;
  updateFile: (projectId: string, fileId: string, updates: Partial<ProjectFile>) => void;
  deleteFile: (projectId: string, fileId: string) => void;
  loadFromLocalDB: (projectId: string) => void;
  syncWithAppwrite: (projectId: string) => Promise<void>;
}
```

**Responsibilities:**
- Per-project file storage
- File tree construction
- Sync status tracking
- LocalDB + Appwrite sync

**Key Features:**
- Files organized by projectId
- Automatic file tree rebuilding
- Duplicate prevention
- Sync metadata for each file

#### 4.1.4 Messages Store (`messagesStore.ts`)
```typescript
interface MessagesState {
  // State
  messagesByProject: Record<string, Message[]>;
  isStreaming: boolean;
  
  // Actions
  addMessage: (projectId: string, message: Message) => void;
  updateMessage: (projectId: string, messageId: string, updates: Partial<Message>) => void;
  clearMessages: (projectId: string) => void;
  loadFromLocalDB: (projectId: string) => void;
  syncWithAppwrite: (projectId: string) => Promise<void>;
}
```

**Responsibilities:**
- Chat message history per project
- Streaming message state
- Message persistence

#### 4.1.5 UI Store (`uiStore.ts`)
```typescript
interface UIState {
  // State
  sidebarCollapsed: boolean;
  terminalCollapsed: boolean;
  previewMode: 'desktop' | 'tablet' | 'mobile';
  theme: 'light' | 'dark';
  
  // Actions
  toggleSidebar: () => void;
  toggleTerminal: () => void;
  setPreviewMode: (mode: 'desktop' | 'tablet' | 'mobile') => void;
  setTheme: (theme: 'light' | 'dark') => void;
}
```

**Responsibilities:**
- UI layout preferences
- Preview mode settings
- Theme management

### 4.2 LocalDB Implementation

```typescript
// lib/localdb/index.ts
class LocalDB {
  private prefix = 'codeCraft_';
  
  // Generic CRUD operations
  getAll<T>(key: string): T[];
  get<T>(key: string, id: string): T | null;
  insert<T>(key: string, item: T): void;
  update<T>(key: string, id: string, updates: Partial<T>): void;
  delete(key: string, id: string): void;
  setItems<T>(key: string, items: T[]): void;
  clear(key: string): void;
}
```

**Storage Keys:**
- `codeCraft_user` - Current user data
- `codeCraft_projects` - User's projects
- `codeCraft_files` - All project files
- `codeCraft_messages` - Chat messages
- `codeCraft_session` - Session backup

**Features:**
- Type-safe operations
- Automatic JSON serialization
- Error handling for storage quota
- Namespace isolation

### 4.3 Store Synchronization Flow

```
User Action
    ↓
API Call to Appwrite
    ↓
Success Response
    ↓
┌───────────────────────────┐
│ 1. Update Zustand Store   │ ← Immediate UI update
└───────────────────────────┘
    ↓
┌───────────────────────────┐
│ 2. Update LocalDB Cache   │ ← Persist to localStorage
└───────────────────────────┘
    ↓
┌───────────────────────────┐
│ 3. Appwrite Broadcasts    │ ← Notify other clients
└───────────────────────────┘
    ↓
Other Client Receives Update
    ↓
Update Their Zustand + LocalDB
```

---

## 5. Authentication System

### 5.1 Authentication Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    REGISTRATION FLOW                         │
└──────────────────────────────────────────────────────────────┘

User Input (email, password, name)
    ↓
POST /api/auth/register
    ↓
Appwrite Account Creation
    ↓
Appwrite Session Creation
    ↓
Set HTTP-Only Cookie (fallback_session)
    ↓
Create User Document in Database
    ↓
Save to LocalDB
    ↓
Update authStore
    ↓
Redirect to /dashboard

┌──────────────────────────────────────────────────────────────┐
│                      LOGIN FLOW                              │
└──────────────────────────────────────────────────────────────┘

User Input (email, password)
    ↓
POST /api/auth/login
    ↓
Appwrite Email/Password Auth
    ↓
Create Appwrite Session
    ↓
Set HTTP-Only Cookie (fallback_session)
    ↓
Fetch User Data from Database
    ↓
Save to LocalDB
    ↓
Update authStore
    ↓
Redirect to /dashboard

┌──────────────────────────────────────────────────────────────┐
│                  SESSION RESTORATION FLOW                    │
└──────────────────────────────────────────────────────────────┘

App Load/Page Refresh
    ↓
SessionInitializer Component Mounts
    ↓
Try: Get Appwrite Session (Primary)
    ↓
Success? → Fetch User Data → Update authStore
    ↓
Failed? → Try Cookie-Based Session (Fallback)
    ↓
Failed? → Try LocalDB User Cache (Last Resort)
    ↓
All Failed? → Redirect to /login
```

### 5.2 Three-Layer Session Persistence

#### Layer 1: Appwrite Session (Primary)
```typescript
// Stored in: Browser cookies (managed by Appwrite SDK)
// Scope: Current domain
// Duration: 1 year (configurable)
// Access: Automatic with Appwrite client
```

#### Layer 2: HTTP-Only Cookie (Fallback)
```typescript
// Cookie: fallback_session
// Attributes:
//   - httpOnly: true (XSS protection)
//   - secure: true (HTTPS only in production)
//   - sameSite: 'lax' (CSRF protection)
//   - maxAge: 365 days
//   - path: '/'
```

#### Layer 3: LocalDB Cache (Last Resort)
```typescript
// localStorage: codeCraft_user
// Contains: User data (no sensitive credentials)
// Purpose: UI hydration only, not for authentication
```

### 5.3 Protected Routes

```typescript
// components/auth/AuthGuard.tsx
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      redirect('/login');
    }
  }, [isAuthenticated, isLoading]);
  
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return null;
  
  return <>{children}</>;
}
```

**Protected Pages:**
- `/dashboard`
- `/[projectId]`
- Any API routes requiring user context

### 5.4 Session Security

**Security Measures:**
- HTTP-only cookies prevent XSS attacks
- SameSite=Lax prevents CSRF attacks
- HTTPS enforced in production
- Automatic session expiry after 1 year
- No sensitive data in localStorage
- Session validation on every API call

---

## 6. AI Integration

### 6.1 AI Architecture

```
User Message
    ↓
POST /api/chat
    ↓
OpenRouter API (Gemini 2.0 Flash)
    ↓
Manual Tool Calling Loop (Max 50 iterations)
    ↓
┌─────────────────────────────────────────────┐
│  Tool Call Detection                        │
│  • create_file                              │
│  • update_file                              │
│  • delete_file                              │
│  • read_file                                │
│  • list_files                               │
└─────────────────────────────────────────────┘
    ↓
Tool Execution
    ↓
Update Files in Appwrite
    ↓
Sync to WebContainer
    ↓
Stream Response to Client
    ↓
Update UI (Zustand + LocalDB)
```

### 6.2 Tool Definitions

```typescript
// lib/ai/toolDefinitions.ts
export const tools = [
  {
    type: "function",
    function: {
      name: "create_file",
      description: "Create a new file with specified content",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path (e.g., 'src/App.tsx')" },
          content: { type: "string", description: "File content" }
        },
        required: ["path", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_file",
      description: "Update existing file content",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path" },
          content: { type: "string", description: "New content" }
        },
        required: ["path", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_file",
      description: "Delete a file",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path to delete" }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read file content",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path to read" }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List all files in project",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  }
];
```

### 6.3 Tool Execution

```typescript
// lib/ai/toolExecutor.ts
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  projectId: string,
  userId: string
): Promise<ToolResult> {
  
  switch (toolName) {
    case "create_file":
      return await createFile(projectId, userId, args.path, args.content);
      
    case "update_file":
      return await updateFile(projectId, args.path, args.content);
      
    case "delete_file":
      return await deleteFile(projectId, args.path);
      
    case "read_file":
      return await readFile(projectId, args.path);
      
    case "list_files":
      return await listFiles(projectId);
      
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
```

**Tool Execution Flow:**
1. Validate tool parameters
2. Check user permissions
3. Execute file operation in Appwrite
4. Update WebContainer file system
5. Return result to AI
6. AI generates response based on result
7. Stream response to client

### 6.4 Streaming Response

```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  
  // Process in background
  (async () => {
    try {
      const response = await openrouter.chat.completions.create({
        model: "google/gemini-2.0-flash-exp:free",
        messages: conversationHistory,
        tools: tools,
        stream: true
      });
      
      for await (const chunk of response) {
        // Stream tokens to client
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          await writer.write(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`));
        }
        
        // Handle tool calls
        if (chunk.choices[0]?.delta?.tool_calls) {
          const result = await executeTool(...);
          // Continue conversation with tool result
        }
      }
    } finally {
      await writer.close();
    }
  })();
  
  return new Response(stream.readable, {
    headers: { "Content-Type": "text/event-stream" }
  });
}
```

### 6.5 AI System Prompt

```typescript
// lib/ai/prompts.ts
export const SYSTEM_PROMPT = `
You are an expert full-stack developer assistant. You help users build web applications.

Guidelines:
- Always use the provided tools to manage files
- Create complete, working code (no placeholders)
- Follow best practices and modern patterns
- Explain changes clearly
- Handle errors gracefully
- Use TypeScript for type safety
- Follow the existing code style

Available tools:
- create_file: Create new files
- update_file: Modify existing files
- delete_file: Remove files
- read_file: Read file contents
- list_files: View project structure

Always structure your responses:
1. Understand the request
2. Plan the changes
3. Execute using tools
4. Explain what you did
`;
```

---

## 7. Real-time Synchronization

### 7.1 Realtime Service

```typescript
// lib/appwrite/realtimeService.ts
class RealtimeService {
  private client: Client;
  
  // Subscribe to project updates
  subscribeToProjects(userId: string, callbacks: {
    onCreate?: (project: Project) => void;
    onUpdate?: (project: Project) => void;
    onDelete?: (projectId: string) => void;
  }): UnsubscribeFn {
    const channel = `databases.${DATABASE_ID}.collections.${COLLECTIONS.PROJECTS}.documents`;
    
    return this.client.subscribe(channel, (response) => {
      const project = response.payload as Project;
      if (project.userId !== userId) return; // Filter by user
      
      if (response.events.includes('.create')) {
        callbacks.onCreate?.(project);
      } else if (response.events.includes('.update')) {
        callbacks.onUpdate?.(project);
      } else if (response.events.includes('.delete')) {
        callbacks.onDelete?.(project.$id);
      }
    });
  }
  
  // Subscribe to file updates
  subscribeToFiles(projectId: string, callbacks: {...}): UnsubscribeFn;
  
  // Subscribe to message updates
  subscribeToMessages(projectId: string, callbacks: {...}): UnsubscribeFn;
}
```

### 7.2 Realtime Hook

```typescript
// lib/hooks/useRealtimeSync.ts
export function useRealtimeSync(projectId: string | null) {
  const user = useAuthStore((state) => state.user);
  const projectsStore = useProjectsStore();
  const filesStore = useFilesStore();
  const messagesStore = useMessagesStore();
  
  useEffect(() => {
    if (!user) return;
    
    // Subscribe to projects
    const unsubProjects = realtimeService.subscribeToProjects(user.$id, {
      onCreate: (project) => {
        projectsStore.addProject(project);
        localDB.insert('codeCraft_projects', project);
      },
      onUpdate: (project) => {
        projectsStore.updateProjectInList(project.$id, project);
        localDB.update('codeCraft_projects', project.$id, project);
      },
      onDelete: (projectId) => {
        projectsStore.removeProjectFromList(projectId);
        localDB.delete('codeCraft_projects', projectId);
      }
    });
    
    // Subscribe to files if project is active
    let unsubFiles: UnsubscribeFn | undefined;
    if (projectId) {
      unsubFiles = realtimeService.subscribeToFiles(projectId, {
        onCreate: (file) => {
          filesStore.addFile(projectId, file);
        },
        onUpdate: (file) => {
          filesStore.updateFile(projectId, file.$id, file);
        },
        onDelete: (fileId) => {
          filesStore.deleteFile(projectId, fileId);
        }
      });
    }
    
    return () => {
      unsubProjects();
      unsubFiles?.();
    };
  }, [user, projectId]);
}
```

### 7.3 Realtime Event Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   CLIENT A (Original)                       │
└─────────────────────────────────────────────────────────────┘
                            │
                    User creates file
                            ↓
                    API Call to Appwrite
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    APPWRITE SERVER                          │
│  • Saves file to database                                   │
│  • Broadcasts WebSocket event to all subscribers            │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ↓                               ↓
┌──────────────────────┐        ┌──────────────────────┐
│    CLIENT A          │        │    CLIENT B          │
│  (receives response) │        │  (receives realtime) │
└──────────────────────┘        └──────────────────────┘
            │                               │
            ↓                               ↓
    Update Zustand                  Realtime Handler
            ↓                               ↓
    Update LocalDB                  Update Zustand
            ↓                               ↓
    Update WebContainer             Update LocalDB
            ↓                               ↓
    UI Refresh                      Update WebContainer
                                            ↓
                                    UI Refresh
```

### 7.4 Conflict Resolution

**Strategy: Last-Write-Wins (LWW)**

```typescript
// Each document has $updatedAt timestamp
// Appwrite automatically handles conflicts using timestamp
// Client-side: Always trust server's latest data

// Example: File conflict
1. Client A updates file at T1
2. Client B updates same file at T2
3. Appwrite saves both, latest timestamp wins
4. All clients receive T2 update via realtime
5. UI reflects latest state
```

**Optimistic Updates:**
```typescript
// Update UI immediately (optimistic)
filesStore.updateFile(projectId, fileId, newContent);

// Then sync with server
try {
  await updateFileAPI(projectId, fileId, newContent);
  // Success - UI already updated
} catch (error) {
  // Revert optimistic update
  filesStore.updateFile(projectId, fileId, oldContent);
  showError("Failed to save changes");
}
```

---

## 8. WebContainer Integration

### 8.1 WebContainer Lifecycle

```
Component Mount
    ↓
Initialize WebContainer Instance
    ↓
Mount File System
    ↓
Install Dependencies (npm install)
    ↓
Start Dev Server (npm run dev)
    ↓
Capture Preview URL
    ↓
Update Preview Component
    ↓
Listen for Terminal Output
```

### 8.2 WebContainer Context

```typescript
// lib/contexts/WebContainerContext.tsx
interface WebContainerContextValue {
  webcontainer: WebContainer | null;
  isBooting: boolean;
  isInstalling: boolean;
  isServerReady: boolean;
  previewUrl: string | null;
  terminal: Terminal | null;
  
  // Methods
  writeFile: (path: string, content: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  runCommand: (command: string) => Promise<void>;
  installDependencies: () => Promise<void>;
}

export function WebContainerProvider({ children }) {
  const [webcontainer, setWebContainer] = useState<WebContainer | null>(null);
  
  useEffect(() => {
    async function initWebContainer() {
      const instance = await WebContainer.boot();
      setWebContainer(instance);
      
      // Mount initial file system
      await instance.mount(fileTree);
      
      // Install dependencies
      await instance.spawn('npm', ['install']);
      
      // Start dev server
      const server = await instance.spawn('npm', ['run', 'dev']);
      
      server.output.pipeTo(new WritableStream({
        write(data) {
          terminal?.write(data);
          
          // Detect server ready
          if (data.includes('Local:')) {
            const url = extractUrl(data);
            setPreviewUrl(url);
          }
        }
      }));
    }
    
    initWebContainer();
  }, []);
  
  return (
    <WebContainerContext.Provider value={{...}}>
      {children}
    </WebContainerContext.Provider>
  );
}
```

### 8.3 File Synchronization with WebContainer

```typescript
// lib/utils/webContainerSync.ts
export async function syncFileToWebContainer(
  webcontainer: WebContainer,
  file: ProjectFile
) {
  const pathParts = file.path.split('/');
  const dirPath = pathParts.slice(0, -1).join('/');
  
  // Create directory if needed
  if (dirPath) {
    await webcontainer.fs.mkdir(dirPath, { recursive: true });
  }
  
  // Write file
  await webcontainer.fs.writeFile(file.path, file.content);
  
  console.log(`[WebContainer] ✅ Synced: ${file.path}`);
}

export async function syncAllFilesToWebContainer(
  webcontainer: WebContainer,
  files: ProjectFile[]
) {
  for (const file of files) {
    await syncFileToWebContainer(webcontainer, file);
  }
}
```

### 8.4 WebContainer File System Structure

```typescript
interface FileSystemTree {
  [path: string]: FileNode | DirectoryNode;
}

interface FileNode {
  file: {
    contents: string;
  };
}

interface DirectoryNode {
  directory: FileSystemTree;
}

// Example:
const fileTree = {
  'package.json': {
    file: { contents: '...' }
  },
  'src': {
    directory: {
      'App.tsx': {
        file: { contents: '...' }
      },
      'main.tsx': {
        file: { contents: '...' }
      }
    }
  }
};
```

### 8.5 Preview URL Handling

```typescript
// WebContainer exposes server on random port
// Format: https://{container-id}-{port}.webcontainer.io

export async function waitForServerReady(
  webcontainer: WebContainer,
  port: number
): Promise<string> {
  return new Promise((resolve) => {
    webcontainer.on('server-ready', (portNum, url) => {
      if (portNum === port) {
        resolve(url);
      }
    });
  });
}
```

---

## 9. API Design

### 9.1 API Routes

```
Authentication
├── POST /api/auth/register      # Create new account
├── POST /api/auth/login         # Sign in
└── POST /api/auth/logout        # Sign out

Projects
├── GET    /api/projects         # List user's projects
├── POST   /api/projects         # Create new project
├── GET    /api/projects/[id]    # Get project details
├── PATCH  /api/projects/[id]    # Update project
├── DELETE /api/projects/[id]    # Delete project
└── GET    /api/projects/[id]/export  # Export as ZIP

Files
├── GET    /api/projects/[id]/files      # List project files
├── POST   /api/projects/[id]/files      # Create file
├── PATCH  /api/projects/[id]/files/[fileId]  # Update file
└── DELETE /api/projects/[id]/files/[fileId]  # Delete file

AI
└── POST /api/chat               # AI chat with streaming
```

### 9.2 API Request/Response Formats

#### Authentication

**POST /api/auth/register**
```typescript
// Request
{
  email: string;
  password: string;
  name: string;
}

// Response (Success)
{
  success: true;
  data: {
    user: User;
    session: Session;
  }
}

// Response (Error)
{
  success: false;
  error: string;
}
```

**POST /api/auth/login**
```typescript
// Request
{
  email: string;
  password: string;
}

// Response
{
  success: true;
  data: {
    user: User;
    session: Session;
  }
}
```

#### Projects

**GET /api/projects**
```typescript
// Query params
{
  limit?: number;    // Default: 100
  offset?: number;   // Default: 0
}

// Response
{
  success: true;
  data: {
    documents: Project[];
    total: number;
  }
}
```

**POST /api/projects**
```typescript
// Request
{
  title: string;
  description?: string;
  framework: 'react' | 'vue' | 'vanilla';
  language: 'typescript' | 'javascript';
}

// Response
{
  success: true;
  data: Project;
}
```

**GET /api/projects/[id]/export**
```typescript
// Response
// Binary: application/zip
// Headers:
//   Content-Disposition: attachment; filename="project-{title}.zip"
```

#### Files

**POST /api/projects/[id]/files**
```typescript
// Request
{
  path: string;
  content: string;
  language?: string;
}

// Response
{
  success: true;
  data: ProjectFile;
}
```

**PATCH /api/projects/[id]/files/[fileId]**
```typescript
// Request
{
  content?: string;
  path?: string;
}

// Response
{
  success: true;
  data: ProjectFile;
}
```

#### AI Chat

**POST /api/chat**
```typescript
// Request
{
  message: string;
  projectId: string;
  conversationHistory: Message[];
}

// Response: Server-Sent Events (SSE)
// Stream format:
data: {"type":"content","content":"token"}
data: {"type":"tool_call","name":"create_file","args":{...}}
data: {"type":"tool_result","result":{...}}
data: {"type":"done"}
```

### 9.3 Error Handling

```typescript
// Standardized error response
interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

// Error codes
const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
};

// HTTP status codes
200 // Success
201 // Created
400 // Bad Request
401 // Unauthorized
403 // Forbidden
404 // Not Found
422 // Validation Error
429 // Rate Limit
500 // Server Error
```

---

## 10. Database Schema

### 10.1 Appwrite Collections

#### Users Collection
```
Collection ID: users
Attributes:
  - $id: string (auto)
  - $createdAt: datetime (auto)
  - $updatedAt: datetime (auto)
  - email: string (required, unique)
  - name: string (required)
  - avatar: string (optional)
  
Indexes:
  - email (unique)
```

#### Projects Collection
```
Collection ID: projects
Attributes:
  - $id: string (auto)
  - $createdAt: datetime (auto)
  - $updatedAt: datetime (auto)
  - userId: string (required, relationship)
  - title: string (required)
  - description: string (optional)
  - framework: string (required) // 'react' | 'vue' | 'vanilla'
  - language: string (required)  // 'typescript' | 'javascript'
  - lastOpenedAt: datetime (optional)
  
Indexes:
  - userId (for user's projects query)
  - userId + lastOpenedAt (for recent projects)
  
Permissions:
  - Create: users
  - Read: owner (userId)
  - Update: owner (userId)
  - Delete: owner (userId)
```

#### Project Files Collection
```
Collection ID: project_files
Attributes:
  - $id: string (auto)
  - $createdAt: datetime (auto)
  - $updatedAt: datetime (auto)
  - projectId: string (required, relationship)
  - userId: string (required, relationship)
  - path: string (required)
  - content: string (required, 1MB limit)
  - language: string (optional)  // 'typescript', 'javascript', 'css', etc.
  - size: number (optional)      // bytes
  
Indexes:
  - projectId (for project's files query)
  - projectId + path (unique, for duplicate prevention)
  
Permissions:
  - Create: owner (userId)
  - Read: owner (userId)
  - Update: owner (userId)
  - Delete: owner (userId)
```

#### Messages Collection
```
Collection ID: messages
Attributes:
  - $id: string (auto)
  - $createdAt: datetime (auto)
  - $updatedAt: datetime (auto)
  - projectId: string (required, relationship)
  - userId: string (required, relationship)
  - role: string (required)      // 'user' | 'assistant' | 'system'
  - content: string (required)
  - sequence: number (required)  // Message order
  - toolCalls: string (optional) // JSON array of tool calls
  
Indexes:
  - projectId + sequence (for ordered message retrieval)
  - projectId (for all project messages)
  
Permissions:
  - Create: owner (userId)
  - Read: owner (userId)
  - Update: owner (userId)
  - Delete: owner (userId)
```

### 10.2 Database Relationships

```
User (1) ──────< (many) Projects
  │
  └────< (many) ProjectFiles
  │
  └────< (many) Messages

Project (1) ────< (many) ProjectFiles
  │
  └────< (many) Messages
```

### 10.3 Data Constraints

**Project Files:**
- Maximum file size: 1 MB per file
- Maximum files per project: 5000
- Allowed characters in path: alphanumeric, /, -, _, .

**Messages:**
- Maximum message length: 10 KB
- Maximum messages per project: 1000
- Auto-cleanup: Delete oldest messages when limit reached

**Projects:**
- Maximum projects per user: 100 (soft limit)
- Project title: 1-100 characters
- Description: 0-500 characters

---

## 11. File System Management

### 11.1 File Tree Structure

```typescript
interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  content?: string;        // Only for files
  language?: string;       // Only for files
  isExpanded?: boolean;    // Only for directories
}

// Example tree
{
  id: 'root',
  name: 'project',
  path: '/',
  type: 'directory',
  isExpanded: true,
  children: [
    {
      id: 'src',
      name: 'src',
      path: '/src',
      type: 'directory',
      isExpanded: true,
      children: [
        {
          id: 'app-tsx',
          name: 'App.tsx',
          path: '/src/App.tsx',
          type: 'file',
          language: 'typescript',
          content: '...'
        }
      ]
    },
    {
      id: 'package-json',
      name: 'package.json',
      path: '/package.json',
      type: 'file',
      language: 'json',
      content: '...'
    }
  ]
}
```

### 11.2 File Tree Building Algorithm

```typescript
// lib/utils/fileSystem.ts
export function buildFileTree(files: ProjectFile[]): FileNode[] {
  const root: Map<string, FileNode> = new Map();
  
  // Sort files by path for consistent ordering
  const sortedFiles = [...files].sort((a, b) => 
    a.path.localeCompare(b.path)
  );
  
  for (const file of sortedFiles) {
    const parts = file.path.split('/').filter(Boolean);
    let currentLevel = root;
    let currentPath = '';
    
    // Build directory structure
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      currentPath += `/${part}`;
      
      if (!currentLevel.has(part)) {
        currentLevel.set(part, {
          id: `dir-${currentPath}`,
          name: part,
          path: currentPath,
          type: 'directory',
          children: [],
          isExpanded: false
        });
      }
      
      const node = currentLevel.get(part)!;
      if (!node.children) node.children = [];
      currentLevel = new Map(node.children.map(c => [c.name, c]));
    }
    
    // Add file node
    const fileName = parts[parts.length - 1];
    currentLevel.set(fileName, {
      id: file.$id,
      name: fileName,
      path: file.path,
      type: 'file',
      content: file.content,
      language: file.language
    });
  }
  
  // Convert Map to array
  return Array.from(root.values()).map(node => {
    if (node.children) {
      node.children = flattenChildren(node.children);
    }
    return node;
  });
}
```

### 11.3 File Operations

#### Create File
```typescript
async function createFile(
  projectId: string,
  userId: string,
  path: string,
  content: string
): Promise<ProjectFile> {
  // Validate path
  validateFilePath(path);
  
  // Check for duplicates
  const existing = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PROJECT_FILES,
    [
      Query.equal('projectId', projectId),
      Query.equal('path', path)
    ]
  );
  
  if (existing.total > 0) {
    throw new Error('File already exists');
  }
  
  // Create in Appwrite
  const file = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.PROJECT_FILES,
    ID.unique(),
    {
      projectId,
      userId,
      path,
      content,
      language: detectLanguage(path),
      size: new Blob([content]).size
    }
  );
  
  return file as ProjectFile;
}
```

#### Update File
```typescript
async function updateFile(
  projectId: string,
  fileId: string,
  updates: Partial<ProjectFile>
): Promise<ProjectFile> {
  // Update in Appwrite
  const file = await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.PROJECT_FILES,
    fileId,
    updates
  );
  
  return file as ProjectFile;
}
```

#### Delete File
```typescript
async function deleteFile(
  projectId: string,
  fileId: string
): Promise<void> {
  await databases.deleteDocument(
    DATABASE_ID,
    COLLECTIONS.PROJECT_FILES,
    fileId
  );
}
```

### 11.4 File Path Validation

```typescript
function validateFilePath(path: string): void {
  // Must start with /
  if (!path.startsWith('/')) {
    throw new Error('Path must start with /');
  }
  
  // No double slashes
  if (path.includes('//')) {
    throw new Error('Path cannot contain //');
  }
  
  // No parent directory references
  if (path.includes('..')) {
    throw new Error('Path cannot contain ..');
  }
  
  // Valid characters only
  const validPattern = /^[a-zA-Z0-9/_.-]+$/;
  if (!validPattern.test(path)) {
    throw new Error('Path contains invalid characters');
  }
  
  // Maximum length
  if (path.length > 500) {
    throw new Error('Path too long (max 500 characters)');
  }
}
```

### 11.5 Language Detection

```typescript
function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  
  const languageMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'json': 'json',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'md': 'markdown',
    'py': 'python',
    'java': 'java',
    'go': 'go',
    'rs': 'rust',
    'yml': 'yaml',
    'yaml': 'yaml',
    'xml': 'xml',
    'sh': 'shell',
  };
  
  return languageMap[ext || ''] || 'plaintext';
}
```

---

## 12. Code Editor Integration

### 12.1 Monaco Editor Setup

```typescript
// components/editor/CodeEditor.tsx
import Editor, { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

export function CodeEditor({ file, onChange }: Props) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  
  function handleEditorDidMount(
    editor: editor.IStandaloneCodeEditor,
    monaco: Monaco
  ) {
    editorRef.current = editor;
    
    // Configure editor
    setupMonaco(monaco);
    
    // Set editor options
    editor.updateOptions({
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      minimap: { enabled: true },
      lineNumbers: 'on',
      roundedSelection: true,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      formatOnPaste: true,
      formatOnType: true,
    });
  }
  
  return (
    <Editor
      height="100%"
      language={file.language}
      value={file.content}
      onChange={onChange}
      onMount={handleEditorDidMount}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        scrollbar: {
          vertical: 'auto',
          horizontal: 'auto'
        }
      }}
    />
  );
}
```

### 12.2 Type Definitions

```typescript
// lib/monaco/typeDefinitions.ts
export function addTypeDefinitions(monaco: Monaco) {
  // React types
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    `
    declare module 'react' {
      export function useState<T>(initial: T): [T, (value: T) => void];
      export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
      // ... more React types
    }
    `,
    'file:///node_modules/@types/react/index.d.ts'
  );
  
  // Configure compiler options
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.ES2015,
    noEmit: true,
    esModuleInterop: true,
    jsx: monaco.languages.typescript.JsxEmit.React,
    reactNamespace: 'React',
    allowJs: true,
    typeRoots: ['node_modules/@types']
  });
}
```

### 12.3 Editor Features

**Enabled Features:**
- Syntax highlighting
- IntelliSense (autocomplete)
- Type checking (for TypeScript)
- Format on save
- Multi-cursor editing
- Find and replace
- Code folding
- Bracket matching
- Minimap
- Line numbers
- Error squiggles

**Keyboard Shortcuts:**
- `Cmd/Ctrl + S` - Save file
- `Cmd/Ctrl + F` - Find
- `Cmd/Ctrl + H` - Find and replace
- `Cmd/Ctrl + /` - Toggle comment
- `Alt + Shift + F` - Format document
- `Cmd/Ctrl + D` - Add selection to next find match

### 12.4 Debounced Save

```typescript
// Debounce content changes to avoid excessive API calls
const debouncedSave = useMemo(
  () =>
    debounce(async (content: string) => {
      if (!currentFile) return;
      
      try {
        // Update in Appwrite
        await updateFileAPI(projectId, currentFile.$id, { content });
        
        // Update Zustand
        filesStore.updateFile(projectId, currentFile.$id, { content });
        
        // Sync to WebContainer
        if (webcontainer) {
          await webcontainer.fs.writeFile(currentFile.path, content);
        }
      } catch (error) {
        console.error('Failed to save file:', error);
      }
    }, 1000),
  [currentFile, projectId, webcontainer]
);
```

---

## 13. Terminal Integration

### 13.1 XTerm.js Setup

```typescript
// components/terminal/Terminal.tsx
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';

export function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const { webcontainer } = useWebContainer();
  
  useEffect(() => {
    if (!terminalRef.current) return;
    
    // Create terminal instance
    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'JetBrains Mono, monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        selection: '#264f78'
      },
      convertEol: true
    });
    
    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);
    
    // Open terminal
    xterm.open(terminalRef.current);
    fitAddon.fit();
    
    // Attach to WebContainer shell
    if (webcontainer) {
      attachShell(xterm, webcontainer);
    }
    
    xtermRef.current = xterm;
    
    return () => {
      xterm.dispose();
    };
  }, [webcontainer]);
  
  return <div ref={terminalRef} className="h-full w-full" />;
}
```

### 13.2 Shell Integration

```typescript
async function attachShell(terminal: XTerm, webcontainer: WebContainer) {
  // Spawn shell process
  const shell = await webcontainer.spawn('jsh', {
    terminal: {
      cols: terminal.cols,
      rows: terminal.rows
    }
  });
  
  // Pipe shell output to terminal
  shell.output.pipeTo(
    new WritableStream({
      write(data) {
        terminal.write(data);
      }
    })
  );
  
  // Pipe terminal input to shell
  terminal.onData((data) => {
    shell.input.getWriter().write(data);
  });
  
  // Handle terminal resize
  terminal.onResize(({ cols, rows }) => {
    shell.resize({ cols, rows });
  });
}
```

### 13.3 Command Execution

```typescript
async function runCommand(
  webcontainer: WebContainer,
  command: string,
  terminal: XTerm
): Promise<void> {
  terminal.writeln(`\r\n$ ${command}`);
  
  const process = await webcontainer.spawn('sh', ['-c', command]);
  
  // Stream output
  const reader = process.output.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    terminal.write(value);
  }
  
  // Get exit code
  const exitCode = await process.exit;
  if (exitCode !== 0) {
    terminal.writeln(`\r\nCommand failed with exit code ${exitCode}`);
  }
}
```

---

## 14. Security

### 14.1 Authentication Security

**Session Management:**
- HTTP-only cookies prevent XSS attacks
- Secure flag enforced in production (HTTPS)
- SameSite=Lax prevents CSRF attacks
- Session expiry after 1 year
- Automatic session rotation

**Password Security:**
- Minimum 8 characters
- Handled by Appwrite (bcrypt hashing)
- No plaintext password storage
- Password reset via email

### 14.2 Authorization

**Resource Access Control:**
```typescript
// Every API route validates user owns resource
async function validateProjectAccess(
  projectId: string,
  userId: string
): Promise<boolean> {
  const project = await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.PROJECTS,
    projectId
  );
  
  return project.userId === userId;
}

// Used in every API route
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser(req);
  if (!user) return unauthorized();
  
  const hasAccess = await validateProjectAccess(params.id, user.$id);
  if (!hasAccess) return forbidden();
  
  // Proceed with deletion
}
```

**Appwrite Permissions:**
```typescript
// Projects: Only owner can read/write
Permission.read(Role.user(userId))
Permission.update(Role.user(userId))
Permission.delete(Role.user(userId))

// Files: Only owner can read/write
Permission.read(Role.user(userId))
Permission.update(Role.user(userId))
Permission.delete(Role.user(userId))
```

### 14.3 Input Validation

**File Path Validation:**
- No parent directory references (..)
- No absolute paths outside project
- Whitelist of allowed characters
- Maximum path length: 500 chars

**Content Validation:**
- Maximum file size: 1 MB
- Content sanitization for XSS
- No executable uploads

**API Input Validation:**
```typescript
import { z } from 'zod';

const CreateFileSchema = z.object({
  path: z.string()
    .min(1)
    .max(500)
    .regex(/^[a-zA-Z0-9/_.-]+$/, 'Invalid path format'),
  content: z.string().max(1024 * 1024), // 1 MB
  language: z.string().optional()
});

export async function POST(req: Request) {
  const body = await req.json();
  
  // Validate input
  const result = CreateFileSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { success: false, error: result.error.message },
      { status: 400 }
    );
  }
  
  // Proceed with validated data
}
```

### 14.4 Rate Limiting

**API Rate Limits:**
- Authentication: 10 requests/minute
- Project operations: 60 requests/minute
- File operations: 120 requests/minute
- AI chat: 20 requests/minute

**Implementation:**
```typescript
// Using Appwrite's built-in rate limiting
// Configured in Appwrite console per endpoint
```

### 14.5 XSS Prevention

**Content Sanitization:**
```typescript
// Use DOMPurify for user-generated content
import DOMPurify from 'dompurify';

function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'code', 'pre'],
    ALLOWED_ATTR: ['href']
  });
}
```

**React Escaping:**
- React automatically escapes JSX content
- Use `dangerouslySetInnerHTML` only with sanitized content

### 14.6 CORS Configuration

```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: process.env.NEXT_PUBLIC_APP_URL },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' }
        ]
      }
    ];
  }
};
```

---

## 15. Performance Optimizations

### 15.1 State Management Optimizations

**Zustand Selectors:**
```typescript
// ❌ Bad: Component re-renders on any state change
const state = useFilesStore();

// ✅ Good: Only re-renders when selectedFile changes
const selectedFile = useFilesStore((state) => state.selectedFile);
```

**Memoization:**
```typescript
// Expensive file tree computation
const fileTree = useMemo(() => {
  return buildFileTree(files);
}, [files]);

// Debounced API calls
const debouncedSave = useMemo(
  () => debounce(saveFile, 1000),
  [saveFile]
);
```

### 15.2 LocalDB Caching Strategy

**Fast Initial Load:**
```
1. App loads
2. Read from LocalDB (1-5ms)
3. Render UI immediately
4. Background: Fetch from Appwrite
5. Update UI with latest data
```

**Cache Invalidation:**
- Clear cache on logout
- Update cache on every write
- Realtime updates sync cache

### 15.3 Code Splitting

```typescript
// Dynamic imports for heavy components
const CodeEditor = dynamic(() => import('@/components/editor/CodeEditor'), {
  ssr: false,
  loading: () => <LoadingSpinner />
});

const Terminal = dynamic(() => import('@/components/terminal/Terminal'), {
  ssr: false
});

// Route-based code splitting (automatic with Next.js App Router)
app/
├── page.tsx           // Landing page bundle
├── dashboard/page.tsx // Dashboard bundle
└── [projectId]/page.tsx // Editor bundle
```

### 15.4 WebContainer Optimizations

**Lazy Initialization:**
```typescript
// Only boot WebContainer when needed
useEffect(() => {
  if (!isProjectPage) return;
  
  const initWebContainer = async () => {
    const instance = await WebContainer.boot();
    setWebContainer(instance);
  };
  
  initWebContainer();
}, [isProjectPage]);
```

**File System Batching:**
```typescript
// Batch multiple file writes
async function batchWriteFiles(
  webcontainer: WebContainer,
  files: ProjectFile[]
) {
  await Promise.all(
    files.map((file) =>
      webcontainer.fs.writeFile(file.path, file.content)
    )
  );
}
```

### 15.5 Image Optimization

```typescript
// Use Next.js Image component
import Image from 'next/image';

<Image
  src="/logo.png"
  width={200}
  height={50}
  alt="Logo"
  priority // For above-the-fold images
/>
```

### 15.6 Bundle Size Optimization

**Analyzed with:**
```bash
npm run build
# Next.js automatically shows bundle analysis
```

**Strategies:**
- Tree-shaking unused code
- Dynamic imports for heavy libraries
- Use `"sideEffects": false` in package.json
- Minimize dependencies

---

## 16. Error Handling

### 16.1 Error Boundaries

```typescript
// components/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to error tracking service (e.g., Sentry)
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h1>Something went wrong</h1>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Usage in layout
export default function RootLayout({ children }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}
```

### 16.2 API Error Handling

```typescript
// Standard error response
interface ApiError {
  success: false;
  error: string;
  code?: string;
}

// API route error handler
function handleApiError(error: unknown): Response {
  console.error('API Error:', error);
  
  if (error instanceof AppwriteException) {
    return Response.json(
      {
        success: false,
        error: error.message,
        code: error.code
      },
      { status: error.code || 500 }
    );
  }
  
  return Response.json(
    {
      success: false,
      error: 'Internal server error'
    },
    { status: 500 }
  );
}

// Usage
export async function POST(req: Request) {
  try {
    // API logic
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 16.3 Client-Side Error Handling

```typescript
// Store action with error handling
async createProject(data: CreateProjectData) {
  set({ isLoading: true, error: null });
  
  try {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    set({ currentProject: result.data, isLoading: false });
    return result.data;
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create project';
    set({ error: message, isLoading: false });
    throw error;
  }
}
```

### 16.4 WebContainer Error Handling

```typescript
async function initWebContainer(): Promise<WebContainer> {
  try {
    const instance = await WebContainer.boot();
    return instance;
  } catch (error) {
    console.error('WebContainer boot failed:', error);
    throw new Error('Failed to initialize WebContainer. Please refresh the page.');
  }
}

async function safeFileWrite(
  webcontainer: WebContainer,
  path: string,
  content: string
) {
  try {
    await webcontainer.fs.writeFile(path, content);
  } catch (error) {
    console.error(`Failed to write file ${path}:`, error);
    // Fallback: Queue for retry
    queueFileWrite(path, content);
  }
}
```

### 16.5 Realtime Connection Errors

```typescript
// Auto-reconnect on connection loss
class RealtimeService {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  subscribe(channel: string, callback: Function): UnsubscribeFn {
    const unsubscribe = this.client.subscribe(channel, callback);
    
    // Handle connection errors
    this.client.on('error', (error) => {
      console.error('Realtime connection error:', error);
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnect();
          this.reconnectAttempts++;
        }, 2000 * this.reconnectAttempts);
      }
    });
    
    return unsubscribe;
  }
  
  private reconnect() {
    // Resubscribe to all channels
    console.log('Attempting to reconnect...');
  }
}
```

---

## 17. Testing Strategy

### 17.1 Testing Pyramid

```
                    /\
                   /  \
                  / E2E \
                 /______\
                /        \
               /Integration\
              /____________\
             /              \
            /  Unit Tests    \
           /__________________\
```

### 17.2 Unit Testing

**Test Framework:** Jest + React Testing Library

```typescript
// __tests__/stores/filesStore.test.ts
import { renderHook, act } from '@testing-library/react';
import { useFilesStore } from '@/lib/stores/filesStore';

describe('FilesStore', () => {
  beforeEach(() => {
    // Reset store
    useFilesStore.getState().reset();
  });
  
  it('should add file to project', () => {
    const { result } = renderHook(() => useFilesStore());
    
    const file = {
      $id: '1',
      projectId: 'proj-1',
      path: '/test.ts',
      content: 'console.log("test");'
    };
    
    act(() => {
      result.current.addFile('proj-1', file);
    });
    
    const files = result.current.getFiles('proj-1');
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('/test.ts');
  });
  
  it('should build file tree correctly', () => {
    const { result } = renderHook(() => useFilesStore());
    
    act(() => {
      result.current.setFiles('proj-1', [
        { $id: '1', path: '/src/App.tsx', content: '...' },
        { $id: '2', path: '/src/main.tsx', content: '...' },
        { $id: '3', path: '/package.json', content: '...' }
      ]);
    });
    
    const tree = result.current.getFileTree('proj-1');
    expect(tree).toHaveLength(2); // 'src' directory and 'package.json'
    expect(tree[0].type).toBe('directory');
    expect(tree[0].children).toHaveLength(2);
  });
});
```

### 17.3 Integration Testing

```typescript
// __tests__/api/projects.test.ts
describe('Projects API', () => {
  let authToken: string;
  
  beforeAll(async () => {
    // Create test user
    authToken = await createTestUser();
  });
  
  it('should create project', async () => {
    const response = await fetch('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        title: 'Test Project',
        framework: 'react',
        language: 'typescript'
      })
    });
    
    const result = await response.json();
    
    expect(response.status).toBe(201);
    expect(result.success).toBe(true);
    expect(result.data.title).toBe('Test Project');
  });
  
  it('should list user projects', async () => {
    const response = await fetch('http://localhost:3000/api/projects', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.data.documents).toBeInstanceOf(Array);
  });
});
```

### 17.4 E2E Testing

**Framework:** Playwright

```typescript
// e2e/project-workflow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Project Workflow', () => {
  test('user can create and edit project', async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Create project
    await page.click('button:has-text("New Project")');
    await page.fill('input[name="title"]', 'E2E Test Project');
    await page.selectOption('select[name="framework"]', 'react');
    await page.click('button:has-text("Create")');
    
    // Wait for editor
    await expect(page).toHaveURL(/\/[a-zA-Z0-9]+/);
    
    // Select file from tree
    await page.click('text=App.tsx');
    
    // Edit file
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.type('// Test comment');
    
    // Wait for auto-save
    await page.waitForTimeout(2000);
    
    // Verify preview updates
    const preview = page.frameLocator('iframe[title="preview"]');
    await expect(preview.locator('body')).toBeVisible();
  });
});
```

### 17.5 Test Coverage Goals

```
Unit Tests:
- Zustand stores: 90%+
- Utility functions: 95%+
- Components: 80%+

Integration Tests:
- API routes: 85%+
- Authentication flow: 100%
- File operations: 90%+

E2E Tests:
- Critical user flows: 100%
  - Registration/Login
  - Project creation
  - File editing
  - Preview functionality
  - Project export
```

---

## Appendix

### A. Environment Variables

```env
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
NEXT_PUBLIC_DATABASE_ID=your-database-id
NEXT_PUBLIC_USERS_COLLECTION_ID=users
NEXT_PUBLIC_PROJECTS_COLLECTION_ID=projects
NEXT_PUBLIC_FILES_COLLECTION_ID=project_files
NEXT_PUBLIC_MESSAGES_COLLECTION_ID=messages

# Appwrite Server (for API routes)
APPWRITE_API_KEY=your-api-key

# OpenRouter AI
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### B. Deployment Checklist

```
□ Set all environment variables in production
□ Enable HTTPS
□ Configure CORS for production domain
□ Set secure cookie flags
□ Enable rate limiting
□ Configure error tracking (Sentry)
□ Set up monitoring (Vercel Analytics)
□ Configure CDN for static assets
□ Enable compression
□ Set up database backups
□ Configure Appwrite production settings
□ Test authentication flow
□ Test realtime subscriptions
□ Verify WebContainer functionality
□ Load testing
□ Security audit
```

### C. Monitoring and Logging

```typescript
// Error tracking with Sentry
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

// Performance monitoring
export function logPerformance(metric: string, duration: number) {
  console.log(`[Performance] ${metric}: ${duration}ms`);
  
  // Send to analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'timing_complete', {
      name: metric,
      value: duration,
      event_category: 'Performance'
    });
  }
}

// User action logging
export function logUserAction(action: string, data?: unknown) {
  console.log(`[User Action] ${action}`, data);
  
  // Send to analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, data);
  }
}
```

### D. Performance Metrics

**Target Metrics:**
- First Contentful Paint (FCP): < 1.8s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.8s
- Cumulative Layout Shift (CLS): < 0.1
- First Input Delay (FID): < 100ms

**Bundle Size Targets:**
- Initial JS bundle: < 200 KB (gzipped)
- Total page weight: < 500 KB
- Code editor bundle: < 1 MB (lazy loaded)

---

## Document Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | Jan 2025 | Initial LLD document | Development Team |

---

**End of Document**
