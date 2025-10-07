# Quick Start - Tool Calling

## What Changed?

Your AI now uses **OpenRouter native tool calling** instead of manual orchestration. The LLM decides which file operations to execute and when.

## Setup

```bash
# 1. Ensure environment variables are set
echo $OPENROUTER_API_KEY  # Should show your key

# 2. Install dependencies (if needed)
npm install

# 3. Start dev server
npm run dev
```

## Test It

1. Open your app
2. Create a new project
3. Try these prompts:

### Test 1: Create New App
```
"Create a simple todo list app"
```

Expected: LLM lists files, creates /index.html, /styles.css, /app.js

### Test 2: Update Existing
```
"Add dark mode to my app"
```

Expected: LLM lists files, reads existing files, updates them with dark mode

### Test 3: Error Handling
```
"Create a file at src/components/Button.js"
```

Expected: LLM explains nested paths aren't supported, offers to create /Button.js instead

## How It Works

```
You: "Create a calculator"
  ↓
AI: "Let me check what exists"
  → list_project_files()
  ↓
AI: "I'll create three files"
  → create_file(/index.html)
  → create_file(/styles.css)
  → create_file(/calculator.js)
  ↓
AI: "Done! Here's what I created..."
```

## Available Tools (for the LLM)

1. **list_project_files** - See what files exist
2. **read_file** - Read file content before modifying
3. **create_file** - Create new file
4. **update_file** - Update existing file
5. **delete_file** - Delete a file

## Current Constraints

- Only root-level files (no `/src/file.js`, use `/file.js`)
- Only `.html`, `.css`, `.js` extensions
- No folders (coming soon)

## Streaming Output Format

Watch for these indicators:

```
[Regular AI text]

🔧 Executing: tool_name
✅ Success message
   Optional description

❌ Error: error message

[More AI text]
```

## Configuration

### Change Model

In frontend (where you make the API call):
```typescript
fetch('/api/chat', {
  body: JSON.stringify({
    messages,
    projectId,
    userId,
    model: 'anthropic/claude-3.5-sonnet' // Change here
  })
})
```

### Adjust Max Iterations

In `src/app/api/chat/route.ts`:
```typescript
const maxIterations = 10; // Change this (line 114)
```

## Troubleshooting

### Tool calls not working?
- Check OpenRouter API key
- Verify model supports tools
- Check console logs

### Infinite loop?
- Check maxIterations setting
- Look for errors in tool execution
- Verify finish_reason handling

### Files not created?
- Check path validation (must start with `/`)
- Check extension (`.html`, `.css`, `.js` only)
- Check Appwrite connection
- Look at console logs

## Key Files

- **`src/app/api/chat/route.ts`** - Main API route with tool calling loop
- **`src/lib/ai/toolDefinitions.ts`** - Tool schemas for OpenRouter
- **`src/lib/ai/toolExecutor.ts`** - Tool execution logic
- **`src/lib/ai/prompts.ts`** - System prompt with tool guidance

## Rollback

If needed, restore old implementation:
```bash
cp src/app/api/chat/route-old-backup.ts src/app/api/chat/route.ts
npm run dev
```

## Documentation

- **`IMPLEMENTATION_SUMMARY.md`** - Overview and examples
- **`TOOL_CALLING_IMPLEMENTATION.md`** - Detailed technical docs
- **`QUICK_START.md`** - This file

## Support

Check the logs for detailed execution info:
```bash
# Terminal running npm run dev shows:
[Chat API] Request: { projectId, userId, model }
[Chat API] Iteration 1
[Chat API] Processing 2 tool call(s)
[Chat API] Tool result: { toolName, success }
```

---

**Ready to go!** Just start the dev server and try creating a project.
