# Tool Calling Flow Diagram

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                           │
│                    (Frontend - Chat Component)                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ POST /api/chat
                             │ { messages, projectId, userId, model }
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                   API Route (/api/chat/route.ts)                 │
│                                                                   │
│  1. Get project files (for context)                              │
│  2. Build conversation with system prompt + context              │
│  3. Start streaming response                                     │
│  4. Enter tool calling loop (max 10 iterations)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
                    ┌────────────────┐
                    │  Tool Calling  │
                    │      Loop      │
                    └───────┬────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ↓                   ↓                   ↓
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Iteration 1 │    │  Iteration 2 │    │  Iteration N │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       └───────────────────┴───────────────────┘
                           │
                           ↓
          ╔════════════════════════════════════════╗
          ║         OpenRouter API Call            ║
          ║                                        ║
          ║  POST /api/v1/chat/completions        ║
          ║  {                                     ║
          ║    model: "...",                       ║
          ║    messages: [...],                    ║
          ║    tools: [toolDefinitions]            ║
          ║  }                                     ║
          ╚════════════════╤═══════════════════════╝
                           │
                           ↓
          ┌────────────────────────────────────┐
          │   LLM (e.g., Gemini, Claude, GPT)  │
          │                                    │
          │  Analyzes request                  │
          │  Decides which tools to call       │
          │  Returns response with tool_calls  │
          └────────────────┬───────────────────┘
                           │
                           ↓
          ╔════════════════════════════════════════╗
          ║         Response Processing            ║
          ╚════════════════╤═══════════════════════╝
                           │
          ┌────────────────┴────────────────┐
          │                                 │
          ↓                                 ↓
    ┌──────────┐                    ┌──────────────┐
    │   Text   │                    │  tool_calls  │
    │ Content  │                    │   Array      │
    └─────┬────┘                    └──────┬───────┘
          │                                │
          │ Stream to client               │ Execute each tool
          ↓                                ↓
   ┌────────────┐              ┌──────────────────────┐
   │   User     │              │  Tool Executor       │
   │   sees     │              │  (toolExecutor.ts)   │
   │   text     │              └──────┬───────────────┘
   └────────────┘                     │
                                      ↓
                      ┌───────────────────────────────┐
                      │   Execute tool based on name: │
                      │                               │
                      │  • list_project_files         │
                      │  • read_file                  │
                      │  • create_file                │
                      │  • update_file                │
                      │  • delete_file                │
                      └───────┬───────────────────────┘
                              │
                              ↓
                  ┌─────────────────────────┐
                  │   Validate parameters   │
                  │   - Check path format   │
                  │   - Check extension     │
                  │   - Check file exists   │
                  └────────┬────────────────┘
                           │
                           ↓
                  ┌─────────────────────────┐
                  │   Execute operation     │
                  │   via Appwrite API      │
                  └────────┬────────────────┘
                           │
                           ↓
                  ┌─────────────────────────┐
                  │   Return result         │
                  │   {                     │
                  │     success: true/false │
                  │     message: "..."      │
                  │     error?: "..."       │
                  │   }                     │
                  └────────┬────────────────┘
                           │
                           │ Stream result to client
                           ↓
                  ┌─────────────────────────┐
                  │   User sees:            │
                  │   🔧 Executing: tool    │
                  │   ✅ Success / ❌ Error  │
                  └────────┬────────────────┘
                           │
                           │ Add to conversation
                           ↓
                  ┌─────────────────────────┐
                  │   Continue loop?        │
                  │                         │
                  │   If tool_calls exist:  │
                  │     → Next iteration    │
                  │                         │
                  │   If finish_reason=stop:│
                  │     → End loop          │
                  └────────┬────────────────┘
                           │
                           ↓
                  ┌─────────────────────────┐
                  │   Save to database      │
                  │   - User message        │
                  │   - Assistant response  │
                  │   - Tool calls metadata │
                  └─────────────────────────┘
```

## Detailed Flow Example

### User Request: "Create a calculator app"

```
Step 1: Initial Request
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User: "Create a calculator app"
  ↓
API receives: {
  messages: [{ role: "user", content: "Create a calculator app" }],
  projectId: "abc123",
  userId: "user456",
  model: "google/gemini-2.5-flash-lite"
}

Step 2: Context Gathering
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
→ getProjectFiles(projectId)
← Returns: []

Build system prompt:
"You are an expert developer...
## CURRENT PROJECT FILES
The project currently contains 0 file(s).
Use list_project_files to get the complete list."

Step 3: First LLM Call (Iteration 1)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
→ OpenRouter API
{
  messages: [
    { role: "system", content: "..." },
    { role: "user", content: "Create a calculator app" }
  ],
  tools: [list_project_files, read_file, create_file, ...]
}

← LLM Response:
{
  content: "I'll create a calculator app. Let me first check the project structure.",
  tool_calls: [
    {
      id: "call_1",
      function: {
        name: "list_project_files",
        arguments: "{}"
      }
    }
  ]
}

Stream to user: "I'll create a calculator app..."

Step 4: Execute Tool (list_project_files)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Stream to user: "🔧 Executing: list_project_files"

→ executeToolCall("list_project_files", {}, { projectId, userId })
  → listProjectFilesExecutor()
    → getProjectFiles(projectId)
    ← Returns: []
  ← Returns: { success: true, files: [], totalFiles: 0 }

Stream to user: "✅ Found 0 files in the project"

Add to conversation:
{
  role: "tool",
  tool_call_id: "call_1",
  name: "list_project_files",
  content: '{"success":true,"files":[],"totalFiles":0}'
}

Step 5: Second LLM Call (Iteration 2)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
→ OpenRouter API
{
  messages: [
    { role: "system", content: "..." },
    { role: "user", content: "Create a calculator app" },
    { role: "assistant", content: "...", tool_calls: [...] },
    { role: "tool", content: '{"success":true,...}' }
  ],
  tools: [...]
}

← LLM Response:
{
  content: "The project is empty. I'll create three files: HTML, CSS, and JavaScript.",
  tool_calls: [
    {
      id: "call_2",
      function: {
        name: "create_file",
        arguments: '{"path":"/index.html","content":"<!DOCTYPE html>..."}'
      }
    },
    {
      id: "call_3",
      function: {
        name: "create_file",
        arguments: '{"path":"/styles.css","content":"* { margin: 0; ..."}'
      }
    },
    {
      id: "call_4",
      function: {
        name: "create_file",
        arguments: '{"path":"/calculator.js","content":"const display = ..."}'
      }
    }
  ]
}

Stream to user: "The project is empty. I'll create three files..."

Step 6: Execute Tools (create_file × 3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tool 1:
Stream: "🔧 Executing: create_file"
→ createFileExecutor("/index.html", "<!DOCTYPE...", undefined)
  → Validate: path starts with /, extension is .html ✓
  → Check: file doesn't exist ✓
  → createFile({ projectId, userId, path, content, ... })
  ← File created in Appwrite
← Returns: { success: true, message: "Successfully created /index.html" }
Stream: "✅ Successfully created /index.html"

Tool 2:
Stream: "🔧 Executing: create_file"
→ createFileExecutor("/styles.css", "* {...", undefined)
  → Validations pass ✓
  → createFile(...)
  ← File created
← Returns: { success: true, message: "Successfully created /styles.css" }
Stream: "✅ Successfully created /styles.css"

Tool 3:
Stream: "🔧 Executing: create_file"
→ createFileExecutor("/calculator.js", "const...", undefined)
  → Validations pass ✓
  → createFile(...)
  ← File created
← Returns: { success: true, message: "Successfully created /calculator.js" }
Stream: "✅ Successfully created /calculator.js"

Step 7: Third LLM Call (Iteration 3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
→ OpenRouter API
{
  messages: [
    ... previous messages ...,
    { role: "tool", content: '{"success":true,"message":"Created /index.html"}' },
    { role: "tool", content: '{"success":true,"message":"Created /styles.css"}' },
    { role: "tool", content: '{"success":true,"message":"Created /calculator.js"}' }
  ],
  tools: [...]
}

← LLM Response:
{
  content: "I've successfully created a calculator app with three files:\n\n- /index.html: The main HTML structure\n- /styles.css: Modern styling with grid layout\n- /calculator.js: Calculator logic with keyboard support\n\nYou can now open /index.html to use the calculator!",
  tool_calls: null,
  finish_reason: "stop"
}

Stream to user: "I've successfully created..."

Step 8: Loop Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
tool_calls: null → continueLoop = false
finish_reason: "stop" → continueLoop = false

Loop ends.

Step 9: Save to Database
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
→ createMessage({
  projectId: "abc123",
  userId: "user456",
  role: "assistant",
  content: "[entire conversation including tool results]",
  metadata: {
    model: "google/gemini-2.5-flash-lite",
    toolCalls: [
      { id: "call_1", function: { name: "list_project_files" } },
      { id: "call_2", function: { name: "create_file" } },
      { id: "call_3", function: { name: "create_file" } },
      { id: "call_4", function: { name: "create_file" } }
    ],
    iterations: 3
  },
  sequence: 1
})

→ updateProject(projectId, { lastMessageAt: "2025-10-07T15:30:00Z" })

Step 10: Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Stream closed.
Response complete.
User sees full conversation with tool executions.
```

## Error Handling Flow

### Example: Invalid Path

```
User: "Create a file at src/components/Button.js"
  ↓
LLM: [decides to create the file]
  tool_calls: [{ name: "create_file", arguments: '{"path":"src/components/Button.js"}' }]
  ↓
Tool Executor: createFileExecutor("src/components/Button.js", ...)
  → Validate path
  ✗ Path contains "/" after first character (nested path)
  ← Returns: {
    success: false,
    error: "Nested paths are not supported. Use root files only (e.g., /file.html)"
  }
  ↓
Stream to user: "❌ Error: Nested paths are not supported..."
  ↓
Add to conversation:
  { role: "tool", content: '{"success":false,"error":"..."}' }
  ↓
Next LLM call (new iteration):
  LLM sees the error in tool result
  LLM explains to user: "I see that nested paths aren't supported yet. Let me create /Button.js at the root instead."
  LLM makes new tool call: create_file("/Button.js", ...)
  ↓
Tool succeeds
  ↓
LLM: "I've created /Button.js at the root level instead."
```

## Key Points

1. **Automatic Context**: Project files are auto-loaded and added to system prompt
2. **Iterative**: LLM can make multiple rounds of tool calls
3. **Streaming**: User sees progress in real-time
4. **Error Recovery**: LLM sees tool errors and can adapt
5. **Safety**: Max iterations prevents infinite loops
6. **Transparency**: Every tool call is logged and streamed

## Tool Call Structure

```json
// From LLM to API
{
  "id": "call_xyz123",
  "type": "function",
  "function": {
    "name": "create_file",
    "arguments": "{\"path\":\"/index.html\",\"content\":\"...\"}"
  }
}

// From API to LLM (after execution)
{
  "role": "tool",
  "tool_call_id": "call_xyz123",
  "name": "create_file",
  "content": "{\"success\":true,\"message\":\"Successfully created /index.html\",\"file\":{...}}"
}
```
