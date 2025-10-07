# Tool Calling Implementation Guide

This document explains the OpenRouter tool calling implementation for the Built-It project.

## Overview

The project now uses **OpenRouter's native tool calling** to let the LLM decide which file operations to execute. Instead of manually orchestrating planning → file operations → summary, the LLM now:

1. Receives tool definitions
2. Analyzes the user request
3. Decides which tools to call and when
4. Calls tools iteratively until the task is complete

## Architecture

### Files Created/Modified

1. **`src/lib/ai/toolDefinitions.ts`** - OpenRouter tool schemas
2. **`src/lib/ai/toolExecutor.ts`** - Tool execution logic
3. **`src/lib/ai/prompts.ts`** - Updated system prompt with tool usage guidance
4. **`src/app/api/chat/route.ts`** - New streaming route with tool calling loop

### Tool Definitions

The system provides 5 tools to the LLM:

```typescript
1. list_project_files - List all files to understand project structure
2. read_file - Read a specific file's content before modifying
3. create_file - Create a new file (HTML, CSS, JS only, root level)
4. update_file - Update existing file with new content
5. delete_file - Delete a file from the project
```

Each tool has:
- Clear description explaining when to use it
- JSON schema defining required/optional parameters
- Validation rules for paths and content

## How It Works

### 1. Request Flow

```
User sends message
    ↓
System adds context (current project files)
    ↓
Call OpenRouter with tools
    ↓
LLM responds with text and/or tool_calls
    ↓
Execute each tool call
    ↓
Add tool results to conversation
    ↓
Call OpenRouter again (loop continues)
    ↓
LLM responds with final answer or more tool calls
    ↓
Loop until finish_reason = "stop"
```

### 2. Example Conversation

**User:** "Create a simple calculator app"

**Iteration 1:**
- LLM response: "I'll create a calculator. Let me check what files exist."
- Tool call: `list_project_files()`
- Tool result: `{"success": true, "files": [], "totalFiles": 0}`

**Iteration 2:**
- LLM response: "The project is empty. I'll create three files."
- Tool calls:
  - `create_file({path: "/index.html", content: "..."})`
  - `create_file({path: "/styles.css", content: "..."})`
  - `create_file({path: "/calculator.js", content: "..."})`
- Tool results: All succeed

**Iteration 3:**
- LLM response: "I've created a calculator app with three files. You can open index.html to use it."
- No tool calls
- finish_reason: "stop"

### 3. Key Implementation Details

#### System Prompt Enhancement

The system prompt now:
- Lists all available tools with descriptions
- Explains the tool usage workflow (check → read → modify → verify)
- Provides project constraints (root-level only, .html/.css/.js only)
- Includes current project context automatically

#### Context Injection

```typescript
// Automatically add project file list to system prompt
let projectFilesContext = "";
const files = await getProjectFiles(projectId);
if (files.length > 0) {
  projectFilesContext = `\n\n## CURRENT PROJECT FILES\n\n...`;
}

const systemPrompt = SYSTEM_PROMPT + projectFilesContext;
```

#### Tool Execution Loop

```typescript
while (continueLoop && iterationCount < maxIterations) {
  // Call OpenRouter
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    body: JSON.stringify({
      model,
      messages: conversationMessages,
      tools: toolDefinitions, // Always include tools
    }),
  });

  const assistantMessage = response.choices[0].message;

  // Stream assistant content
  if (assistantMessage.content) {
    stream(assistantMessage.content);
  }

  // Execute tool calls
  if (assistantMessage.tool_calls) {
    for (const toolCall of assistantMessage.tool_calls) {
      const result = await executeToolCall(toolCall, context);
      conversationMessages.push(result);
    }
    continueLoop = true; // Continue for next iteration
  } else {
    continueLoop = false; // No more tools, done
  }
}
```

#### Tool Executor

Each tool:
1. Validates input parameters (path format, file extension, etc.)
2. Checks current project state (does file exist?)
3. Executes the operation via Appwrite database
4. Returns structured result with success/error

```typescript
// Example: create_file executor
async function createFileExecutor(path, content, description, context) {
  // Validate path starts with /
  if (!path.startsWith("/")) {
    return { success: false, error: "Path must start with /" };
  }

  // Check for nested paths (not supported)
  if (path.includes("/", 1)) {
    return { success: false, error: "Nested paths not supported" };
  }

  // Check file extension
  if (!path.match(/\.(html|css|js)$/i)) {
    return { success: false, error: "Only .html, .css, .js allowed" };
  }

  // Check if file exists
  const files = await getProjectFiles(context.projectId);
  if (files.find(f => f.path === path)) {
    return { success: false, error: "File exists, use update_file" };
  }

  // Create the file
  const file = await createFile({...});

  return {
    success: true,
    message: `Successfully created ${path}`,
    file: {...}
  };
}
```

## Benefits Over Previous Approach

### Before (Manual Orchestration)
1. Generate plan (separate LLM call)
2. Generate all file operations at once (separate LLM call with structured output)
3. Execute all operations blindly
4. Generate summary (separate LLM call)

**Issues:**
- No dynamic decision making
- Can't read files before modifying
- Can't recover from errors mid-execution
- Fixed workflow (can't adapt)

### After (Tool Calling)
1. LLM decides what to do step-by-step
2. Can list/read files before making changes
3. Sees results after each operation
4. Adapts based on success/failure
5. More natural conversation flow

**Benefits:**
- Dynamic and adaptive
- Can verify before modifying
- Error recovery built-in
- LLM has full control of workflow
- Better user experience (more transparent)

## Configuration

### Environment Variables

```env
OPENROUTER_API_KEY=your_key_here
NEXT_PUBLIC_APP_URL=https://your-app.com
```

### Model Selection

Default model: `google/gemini-2.5-flash-lite`

Supported models (from `src/lib/ai/openrouter.ts`):
- `google/gemini-2.5-flash-lite`
- `anthropic/claude-3.5-sonnet`
- `openai/gpt-4-turbo`
- `meta-llama/llama-3.1-70b-instruct`

### Iteration Limits

```typescript
const maxIterations = 10; // Prevents infinite loops
```

## Streaming Response Format

The chat API streams responses in this format:

```
[LLM text response]

🔧 Executing: create_file
✅ Successfully created /index.html
   Main HTML structure for the app

🔧 Executing: create_file
✅ Successfully created /styles.css
   Styling for the application

[LLM final summary text]
```

## Error Handling

### Tool Execution Errors

```typescript
// If tool fails, LLM sees the error
{
  "success": false,
  "error": "Path must start with /",
  "availableFiles": ["/index.html"] // Context for recovery
}
```

The LLM can then:
- Explain the error to the user
- Retry with corrected parameters
- Choose a different approach

### API Errors

```typescript
if (!response.ok) {
  throw new Error(`OpenRouter API error: ${response.status}`);
}
```

Caught by stream error handler and shown to user.

## Best Practices for the LLM

The system prompt teaches the LLM to:

1. **Always check first**: Use `list_project_files` before making changes
2. **Read before updating**: Use `read_file` to see current content
3. **One step at a time**: Make one tool call, check result, proceed
4. **Provide complete content**: When updating files, include ALL code
5. **Validate paths**: Ensure paths start with / and use allowed extensions
6. **Explain actions**: Tell user what you're doing and why
7. **Handle errors**: If a tool fails, explain and offer alternatives

## Testing the Implementation

### Test Case 1: Create New Project

```
User: "Create a todo list app"

Expected flow:
1. list_project_files → sees empty project
2. create_file /index.html → success
3. create_file /styles.css → success
4. create_file /app.js → success
5. Final summary
```

### Test Case 2: Update Existing File

```
User: "Add dark mode to my app"

Expected flow:
1. list_project_files → sees existing files
2. read_file /styles.css → reads current CSS
3. update_file /styles.css → adds dark mode styles
4. read_file /app.js → reads current JS
5. update_file /app.js → adds dark mode toggle
6. Final summary
```

### Test Case 3: Error Recovery

```
User: "Create a file at src/index.html"

Expected flow:
1. create_file /src/index.html → fails (nested path)
2. LLM explains: "Nested paths not supported, creating /index.html instead"
3. create_file /index.html → success
```

## Migration Notes

### Breaking Changes

None. The API contract remains the same:

```typescript
POST /api/chat
Body: { messages, projectId, userId, model? }
Response: Streaming text
```

### Database Schema

No changes needed. Messages are still saved with:
- `content`: Full conversation including tool results
- `metadata.toolCalls`: Array of tool calls made
- `metadata.iterations`: Number of LLM calls

### Rollback

If issues arise, restore the old implementation:

```bash
cp src/app/api/chat/route-old-backup.ts src/app/api/chat/route.ts
```

## Future Enhancements

### Planned Improvements

1. **Support nested folders**
   - Update validators in `toolExecutor.ts`
   - Allow paths like `/src/components/Button.tsx`

2. **Support more file types**
   - Add `.tsx`, `.jsx`, `.json`, `.md`, etc.
   - Update validation logic

3. **Add more tools**
   - `rename_file` - Rename/move files
   - `search_code` - Search within file contents
   - `run_command` - Execute npm/shell commands

4. **Better error messages**
   - Include suggestions in error responses
   - Show similar file paths when file not found

5. **Tool call batching**
   - Allow LLM to make multiple parallel tool calls
   - Execute in parallel where safe

## Troubleshooting

### Issue: Tool calls not executing

**Check:**
- OpenRouter API key is set
- Model supports tool calling
- `tools` parameter is included in request

### Issue: Infinite loop

**Check:**
- `maxIterations` limit (default 10)
- LLM is receiving tool results properly
- finish_reason is being handled

### Issue: Files not created

**Check:**
- Path validation (starts with /, correct extension)
- Appwrite database connection
- User permissions
- Console logs for specific errors

## Conclusion

The new tool calling implementation gives the LLM full autonomy to:
- Explore the project structure
- Read files before modifying
- Make incremental changes
- Verify results
- Recover from errors
- Provide transparent feedback

This creates a more natural, reliable, and powerful AI coding assistant.
