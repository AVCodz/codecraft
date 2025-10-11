# Tool Calling Flow

## Overview

Our AI uses **manual tool calling loop** to execute file operations. This document explains the complete flow from user message to final response.

```
User Message
    ↓
Chat API Route
    ↓
OpenRouter API (with tools)
    ↓
Tool Execution Loop (max 50 iterations)
    ↓
Stream Response to Client
```

## Architecture

### Components

1. **Chat API Route** - `src/app/api/chat/route.ts`
   - Handles streaming requests
   - Manages tool calling loop
   - Saves messages to database

2. **Tool Definitions** - `src/lib/ai/toolDefinitions.ts`
   - OpenRouter-compatible tool schemas
   - Available tools and parameters

3. **Tool Executor** - `src/lib/ai/toolExecutor.ts`
   - Executes file operations
   - Syncs with Appwrite + Stores + LocalDB

4. **System Prompt** - `src/lib/ai/prompts.ts`
   - AI behavior instructions
   - Tool usage guidelines

## Complete Flow

### Step 1: User Sends Message

**Component**: `ChatInterface.tsx`

```typescript
async function handleSendMessage() {
  // Add user message to UI
  const userMessage = {
    role: 'user',
    content: input
  };
  
  setMessages([...messages, userMessage]);
  
  // Call API
  const response = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      messages: [...messages, userMessage],
      projectId,
      userId,
      model: 'google/gemini-2.0-flash-exp:free'
    })
  });
  
  // Handle streaming response
  const reader = response.body.getReader();
  // ... stream handling
}
```

### Step 2: API Route Preparation

**File**: `src/app/api/chat/route.ts`

```typescript
export async function POST(req: NextRequest) {
  const { messages, projectId, userId, model } = await req.json();
  
  // 1. Get project context
  const project = await getProject(projectId);
  const projectSummary = project?.summary || 
    "New project - no previous work completed yet.";
  
  // 2. Get current files for context
  const files = await getProjectFiles(projectId);
  const projectFilesContext = `
## CURRENT PROJECT FILES
The project currently contains ${files.length} file(s):
${files.map(f => `- ${f.path} (${f.language})`).join('\n')}
  `;
  
  // 3. Prepare conversation
  const conversationMessages = [
    {
      role: "system",
      content: SYSTEM_PROMPT + projectContext
    },
    {
      role: "user", 
      content: lastUserMessage.content
    }
  ];
  
  // 4. Start tool calling loop
  // ... (see next step)
}
```

### Step 3: Tool Calling Loop

**The Core Loop** (max 50 iterations):

```typescript
let continueLoop = true;
let iterationCount = 0;
const maxIterations = 50;

while (continueLoop && iterationCount < maxIterations) {
  iterationCount++;
  
  // ─────────────────────────────────────────
  // Call OpenRouter API
  // ─────────────────────────────────────────
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: conversationMessages,
        tools: toolDefinitions, // Available tools
        temperature: 0.1,
        topP: 0.9
      })
    }
  );
  
  const data = await response.json();
  const choice = data.choices[0];
  const assistantMessage = choice.message;
  
  // ─────────────────────────────────────────
  // Check if AI wants to call tools
  // ─────────────────────────────────────────
  if (assistantMessage.tool_calls && 
      assistantMessage.tool_calls.length > 0) {
    
    // Add assistant's tool call message to conversation
    conversationMessages.push({
      role: "assistant",
      content: assistantMessage.content,
      tool_calls: assistantMessage.tool_calls
    });
    
    // ─────────────────────────────────────────
    // Execute each tool call
    // ─────────────────────────────────────────
    for (const toolCall of assistantMessage.tool_calls) {
      const toolResult = await executeToolCall(toolCall, {
        projectId,
        userId,
        webContainer
      });
      
      // Add tool result to conversation
      conversationMessages.push(toolResult);
      
      // Track for project summary
      allToolCalls.push({
        name: toolCall.function.name,
        args: JSON.parse(toolCall.function.arguments)
      });
    }
    
    // Continue loop to let AI process tool results
    continueLoop = true;
    
  } else {
    // ─────────────────────────────────────────
    // AI has final response, stop loop
    // ─────────────────────────────────────────
    continueLoop = false;
    assistantContent = assistantMessage.content || "";
    
    // Stream response to client
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify({
        type: "content",
        content: assistantContent
      })}\n\n`)
    );
  }
}
```

### Step 4: Tool Execution

**File**: `src/lib/ai/toolExecutor.ts`

```typescript
export async function executeToolCall(
  toolCall: ToolCall,
  context: ExecutionContext
): Promise<ToolResult> {
  const toolName = toolCall.function.name;
  const args = JSON.parse(toolCall.function.arguments);
  
  let result: unknown;
  
  // ─────────────────────────────────────────
  // Route to appropriate executor
  // ─────────────────────────────────────────
  switch (toolName) {
    case "list_project_files":
      result = await listProjectFilesExecutor(context);
      break;
      
    case "read_file":
      result = await readFileExecutor(
        args.path, 
        context
      );
      break;
      
    case "create_file":
      result = await createFileExecutor(
        args.path,
        args.content,
        args.description,
        context
      );
      break;
      
    case "update_file":
      result = await updateFileExecutor(
        args.path,
        args.content, 
        args.description,
        context
      );
      break;
      
    case "delete_file":
      result = await deleteFileExecutor(
        args.path,
        context
      );
      break;
      
    // ... other tools
  }
  
  // ─────────────────────────────────────────
  // Return formatted result
  // ─────────────────────────────────────────
  return {
    role: "tool",
    tool_call_id: toolCall.id,
    name: toolName,
    content: JSON.stringify(result)
  };
}
```

### Step 5: Individual Tool Executors

#### Example: Create File

```typescript
async function createFileExecutor(
  path: string,
  content: string,
  description: string | undefined,
  context: ExecutionContext
): Promise<ToolExecutionResult> {
  
  // ─────────────────────────────────────────
  // 1. Validate inputs
  // ─────────────────────────────────────────
  if (!path || !content) {
    return {
      success: false,
      error: "Path and content required"
    };
  }
  
  // ─────────────────────────────────────────
  // 2. Write to Appwrite Database
  // ─────────────────────────────────────────
  const file = await createFile({
    projectId: context.projectId,
    userId: context.userId,
    path,
    content,
    type: path.includes('/') ? 'file' : 'unknown',
    language: getLanguageFromPath(path),
    description,
    size: content.length
  });
  
  // ─────────────────────────────────────────
  // 3. Update Zustand Store (triggers UI update)
  // ─────────────────────────────────────────
  const filesStore = useFilesStore.getState();
  filesStore.addFile(context.projectId, file);
  
  // ─────────────────────────────────────────
  // 4. Write to WebContainer (if available)
  // ─────────────────────────────────────────
  if (context.webContainer) {
    await context.webContainer.fs.writeFile(path, content);
  }
  
  // ─────────────────────────────────────────
  // 5. LocalDB auto-updates via store
  // ─────────────────────────────────────────
  // (handled automatically in filesStore.addFile)
  
  return {
    success: true,
    message: `Created ${path} (${content.length} bytes)`,
    file: {
      path: file.path,
      size: file.size,
      language: file.language
    }
  };
}
```

### Step 6: Conversation Example

**User**: "Create a todo list app with React"

**Iteration 1**: AI decides to create files
```json
{
  "role": "assistant",
  "content": null,
  "tool_calls": [
    {
      "id": "call_1",
      "function": {
        "name": "create_file",
        "arguments": "{\"path\": \"src/App.tsx\", \"content\": \"import React from 'react';\\n...\"}"
      }
    },
    {
      "id": "call_2", 
      "function": {
        "name": "create_file",
        "arguments": "{\"path\": \"src/TodoList.tsx\", \"content\": \"...\"}"
      }
    }
  ]
}
```

**Tool Execution**: Files created in Appwrite + Store + WebContainer

**Tool Results Added to Conversation**:
```json
[
  {
    "role": "tool",
    "tool_call_id": "call_1",
    "name": "create_file",
    "content": "{\"success\": true, \"message\": \"Created src/App.tsx\"}"
  },
  {
    "role": "tool",
    "tool_call_id": "call_2",
    "name": "create_file", 
    "content": "{\"success\": true, \"message\": \"Created src/TodoList.tsx\"}"
  }
]
```

**Iteration 2**: AI sees results and responds to user
```json
{
  "role": "assistant",
  "content": "I've created a todo list app for you with:\n- src/App.tsx: Main component\n- src/TodoList.tsx: Todo list logic\n\nThe app includes add, delete, and toggle functionality.",
  "tool_calls": null
}
```

**Loop Ends**: Stream response to client

### Step 7: Streaming Response

```typescript
// In API route
controller.enqueue(
  encoder.encode(`data: ${JSON.stringify({
    type: "content",
    content: assistantContent
  })}\n\n`)
);

controller.enqueue(
  encoder.encode(`data: ${JSON.stringify({
    type: "done"
  })}\n\n`)
);

controller.close();
```

```typescript
// In client
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      
      if (data.type === 'content') {
        setStreamingContent(prev => prev + data.content);
      } else if (data.type === 'done') {
        // Save to messages
        setMessages([...messages, {
          role: 'assistant',
          content: streamingContent
        }]);
      }
    }
  }
}
```

## Available Tools

### 1. `list_project_files`
**Purpose**: List all files in project  
**Parameters**: None  
**Returns**: Array of file objects with path, language, size

### 2. `read_file`
**Purpose**: Read file contents  
**Parameters**: `path`  
**Returns**: File content as string

### 3. `create_file`
**Purpose**: Create new file  
**Parameters**: `path`, `content`, `description` (optional)  
**Returns**: Created file metadata

### 4. `update_file`
**Purpose**: Update existing file  
**Parameters**: `path`, `content`, `description` (optional)  
**Returns**: Updated file metadata

### 5. `delete_file`
**Purpose**: Delete file  
**Parameters**: `path`  
**Returns**: Success confirmation

### 6. `search_files`
**Purpose**: Search for files by name/extension  
**Parameters**: `query`, `extensions`, `maxResults`  
**Returns**: Matching files

### 7. `find_in_files`
**Purpose**: Search content within files  
**Parameters**: `searchTerm`, `extensions`, `caseSensitive`  
**Returns**: Files with matches

### 8. `install_packages`
**Purpose**: Install npm packages  
**Parameters**: `packages` (array)  
**Returns**: Installation result

### 9. `run_command`
**Purpose**: Execute shell command  
**Parameters**: `command`  
**Returns**: Command output

## System Prompt Guidelines

The AI is instructed to:

1. **Always check existing files first**
   ```
   Before creating/updating, use list_project_files and read_file
   ```

2. **Create complete, working files**
   ```
   Include all imports, proper TypeScript types, and handle errors
   ```

3. **Follow project patterns**
   ```
   Use existing libraries (React, Tailwind, TypeScript)
   Match code style from existing files
   ```

4. **Use multiple tools per turn**
   ```
   Create multiple related files in one tool call round
   ```

5. **Provide feedback**
   ```
   After tool execution, explain what was created/changed
   ```

## Data Sync After Tool Execution

```
Tool Executor
     ↓
┌─────────────────────────────────────┐
│ 1. Appwrite API                     │
│    - Creates/Updates document       │
│    - Returns doc with $id, $updatedAt│
└─────────────────────────────────────┘
     ↓
┌─────────────────────────────────────┐
│ 2. Zustand Store                    │
│    - filesStore.addFile()           │
│    - Rebuilds file tree             │
│    - Triggers React re-render       │
└─────────────────────────────────────┘
     ↓
┌─────────────────────────────────────┐
│ 3. LocalDB                          │
│    - Auto-updates via store method  │
│    - Keeps cache fresh              │
└─────────────────────────────────────┘
     ↓
┌─────────────────────────────────────┐
│ 4. WebContainer (if available)      │
│    - Writes to virtual filesystem   │
│    - Updates preview                │
└─────────────────────────────────────┘
     ↓
┌─────────────────────────────────────┐
│ 5. Realtime Broadcast               │
│    - Appwrite sends to subscribers  │
│    - Other clients receive update   │
└─────────────────────────────────────┘
```

## Error Handling

### API Level Errors
```typescript
try {
  const result = await executeToolCall(toolCall, context);
  conversationMessages.push(result);
} catch (error) {
  // Send error as tool result
  conversationMessages.push({
    role: "tool",
    tool_call_id: toolCall.id,
    name: toolCall.function.name,
    content: JSON.stringify({
      success: false,
      error: error.message
    })
  });
}
```

### Tool Executor Errors
```typescript
async function createFileExecutor(...) {
  try {
    const file = await createFile({...});
    return { success: true, file };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create file: ${error.message}`
    };
  }
}
```

### Client-side Error Handling
```typescript
if (data.type === 'error') {
  setError(data.message);
  setIsStreaming(false);
}
```

## Performance Optimizations

### 1. Parallel Tool Execution
AI can call multiple tools simultaneously:
```json
{
  "tool_calls": [
    {"function": {"name": "create_file", "arguments": "..."}},
    {"function": {"name": "create_file", "arguments": "..."}},
    {"function": {"name": "create_file", "arguments": "..."}}
  ]
}
```

Tools execute in parallel via `Promise.all`.

### 2. Max Iterations Limit
Prevents infinite loops:
```typescript
const maxIterations = 50;
if (iterationCount >= maxIterations) {
  throw new Error("Max tool calling iterations reached");
}
```

### 3. Tool Result Caching
Avoid re-reading files:
```typescript
const fileCache = new Map<string, string>();

async function readFileExecutor(path: string, context) {
  if (fileCache.has(path)) {
    return { success: true, content: fileCache.get(path) };
  }
  // ... read from database
  fileCache.set(path, content);
}
```

## Debugging

Enable verbose logging:
```typescript
// In chat API route
console.log('[Chat API] 🔄 Iteration', iterationCount);
console.log('[Chat API] 🔧 Tool calls:', assistantMessage.tool_calls);
console.log('[Chat API] 📝 Tool results:', toolResults);
```

View in browser console:
```typescript
// In ChatInterface
console.log('[ChatInterface] Message sent:', message);
console.log('[ChatInterface] Streaming chunk:', chunk);
```

## Summary

**Flow**: User → API → OpenRouter → Tool Loop → Executors → Response

**Key Points**:
1. Manual loop with max 50 iterations
2. Tools execute synchronously per iteration
3. Results added to conversation for AI context
4. Streaming response provides real-time feedback
5. Full state sync (Appwrite → Zustand → LocalDB → WebContainer)

**Best Practices**:
- Always check existing files before creating
- Use descriptive error messages
- Log all tool executions
- Handle edge cases (missing files, invalid paths)
- Keep tool execution fast (<2s per tool)
