# Tool Calling Configuration

## Current Configuration

### Max Iterations (Steps)
```typescript
const maxIterations = 50;
```

**What this means:**
- The LLM can make up to **50 round trips** (iterations) with the API
- Each iteration can include:
  - LLM text response
  - Multiple tool calls (unlimited per iteration)

**Example with 50 iterations:**
```
Iteration 1:  LLM calls 1 tool  (list_project_files)
Iteration 2:  LLM calls 3 tools (create_file × 3)
Iteration 3:  LLM calls 2 tools (read_file × 2)
Iteration 4:  LLM calls 5 tools (update_file × 5)
...
Iteration 50: LLM provides final summary

Total possible tool calls: UNLIMITED (no hard limit per iteration)
```

### Token Limits
```typescript
// No max_tokens limit - let the model generate as much as needed
```

**What this means:**
- The LLM can generate responses of **any length** per iteration
- Limited only by the model's native context window:
  - Gemini 2.5 Flash: ~1 million tokens input, 28k output
  - Claude Sonnet: ~200k tokens input, 4k output
  - GPT-4 Turbo: ~128k tokens input, 4k output

**Why remove the limit?**
- Allows full, detailed responses
- No truncation of tool calls
- Better explanations and summaries
- More complete code generation

## How Many Tools Can Be Called?

### Per Iteration
**Unlimited** - The LLM can call as many tools as it wants in a single response.

Example:
```json
{
  "tool_calls": [
    { "name": "list_project_files" },
    { "name": "read_file", "arguments": "{\"path\":\"/index.html\"}" },
    { "name": "read_file", "arguments": "{\"path\":\"/styles.css\"}" },
    { "name": "update_file", "arguments": "{\"path\":\"/index.html\", ...}" },
    { "name": "update_file", "arguments": "{\"path\":\"/styles.css\", ...}" },
    { "name": "create_file", "arguments": "{\"path\":\"/app.js\", ...}" }
    // ... can keep adding more
  ]
}
```

### Total Across All Iterations
**Theoretical Maximum:**
```
50 iterations × ∞ tools per iteration = UNLIMITED total tool calls
```

**Practical limits:**
- API timeout (varies by hosting)
- User patience
- Context window of the model
- finish_reason: "stop" (LLM decides it's done)

## Real-World Examples

### Example 1: Simple Task (3 iterations)
```
User: "Create a todo app"

Iteration 1:
  - list_project_files (1 tool)

Iteration 2:
  - create_file /index.html
  - create_file /styles.css
  - create_file /app.js
  (3 tools)

Iteration 3:
  - Final summary (0 tools)
  - finish_reason: "stop"

Total: 3 iterations, 4 tool calls
```

### Example 2: Complex Task (15 iterations)
```
User: "Create a full e-commerce site with product pages, cart, and checkout"

Iteration 1:  list_project_files (1 tool)
Iteration 2:  create 10 HTML files (10 tools)
Iteration 3:  create 5 CSS files (5 tools)
Iteration 4:  create 8 JS files (8 tools)
Iteration 5:  read 3 files to check structure (3 tools)
Iteration 6:  update 3 files with fixes (3 tools)
Iteration 7:  create 2 more utility files (2 tools)
Iteration 8:  read cart.js (1 tool)
Iteration 9:  update cart.js with more features (1 tool)
Iteration 10: read checkout.js (1 tool)
Iteration 11: update checkout.js (1 tool)
Iteration 12: create config.js (1 tool)
Iteration 13: update all HTML files to link config (10 tools)
Iteration 14: final verification reads (5 tools)
Iteration 15: summary (0 tools)

Total: 15 iterations, 52 tool calls
```

### Example 3: Maximum Complexity (50 iterations)
```
User: "Create a complete web application with multiple pages, features,
      fix all errors, optimize, add dark mode, make it responsive..."

Iteration 1-5:   Initial file creation
Iteration 6-10:  Read and analyze structure
Iteration 11-20: Update files with new features
Iteration 21-30: Fix errors and bugs
Iteration 31-40: Add optimizations
Iteration 41-48: Polish and final touches
Iteration 49:    Final verification
Iteration 50:    Summary

Could involve 200+ total tool calls across all iterations
```

## Tool Call Execution

### Sequential Execution
Tool calls are executed **sequentially within each iteration**:

```typescript
for (const toolCall of assistantMessage.tool_calls) {
  // Execute one at a time
  const result = await executeToolCall(toolCall, context);

  // Stream result to user immediately
  stream(`✅ ${result.message}`);

  // Add to conversation for next iteration
  conversationMessages.push(result);
}
```

**Why sequential?**
- Tools may depend on each other (e.g., read file, then update it)
- Ensures consistent state (no race conditions)
- User sees progress in order
- Easier error handling

### Parallel Execution (Future Enhancement)
Could be added for independent operations:
```typescript
// Future: Execute independent tools in parallel
const independentTools = identifyIndependentTools(tool_calls);
await Promise.all(independentTools.map(executeToolCall));
```

## Performance Considerations

### Current Setup
```
Average iteration time: 2-5 seconds
Average tool execution: 100-500ms
Max response time (50 iterations): ~2-4 minutes
```

### Optimization Options

1. **Reduce max iterations for simpler tasks:**
   ```typescript
   const maxIterations = userType === 'simple' ? 20 : 50;
   ```

2. **Add timeout per iteration:**
   ```typescript
   const iterationTimeout = 30000; // 30 seconds max per iteration
   ```

3. **Dynamic iteration limits:**
   ```typescript
   const maxIterations = Math.min(50, estimatedComplexity * 5);
   ```

## Model-Specific Limits

### Gemini 2.5 Flash Lite (Default)
```javascript
{
  input_tokens: 1_000_000,  // Context window
  output_tokens: 28_192,    // Max per response (now unlimited in config)
  supports_tools: true,
  parallel_tool_calls: false
}
```

### Claude 3.5 Sonnet
```javascript
{
  input_tokens: 200_000,
  output_tokens: 4_096,    // Smaller than Gemini
  supports_tools: true,
  parallel_tool_calls: true  // Can call multiple tools at once
}
```

### GPT-4 Turbo
```javascript
{
  input_tokens: 128_000,
  output_tokens: 4_096,
  supports_tools: true,
  parallel_tool_calls: true
}
```

## Adjusting Configuration

### Increase Max Iterations
```typescript
// In src/app/api/chat/route.ts line 92
const maxIterations = 100; // For very complex tasks
```

### Add Max Tokens Back (If Needed)
```typescript
body: JSON.stringify({
  model,
  messages: conversationMessages,
  tools: toolDefinitions,
  temperature: 0.1,
  max_tokens: 8192, // Add back if you want to limit
}),
```

### Add Per-Tool Timeout
```typescript
// In src/lib/ai/toolExecutor.ts
const TOOL_TIMEOUT = 10000; // 10 seconds

export async function executeToolCall(toolCall, context) {
  return Promise.race([
    actualToolExecution(toolCall, context),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Tool timeout')), TOOL_TIMEOUT)
    )
  ]);
}
```

## Monitoring Tool Calls

### Console Logs Show:
```bash
[Chat API] Request: { projectId, userId, model, messageCount }
[Chat API] Iteration 1
[Chat API] Assistant message: { hasToolCalls: true, toolCallsCount: 3 }
[Chat API] Processing 3 tool call(s)
[Chat API] Tool result: { toolName: "create_file", success: true }
[Chat API] Tool result: { toolName: "create_file", success: true }
[Chat API] Tool result: { toolName: "create_file", success: true }
[Chat API] Iteration 2
...
[Chat API] Assistant message saved
```

### Database Stores:
```json
{
  "metadata": {
    "iterations": 5,
    "toolCalls": [
      { "id": "call_1", "function": { "name": "list_project_files" } },
      { "id": "call_2", "function": { "name": "create_file" } },
      // ... all tool calls
    ]
  }
}
```

## Summary

| Metric | Value |
|--------|-------|
| **Max Iterations** | 50 |
| **Tools per Iteration** | Unlimited |
| **Max Tokens per Response** | Unlimited (model's native limit) |
| **Total Tool Calls** | Unlimited (50 × ∞) |
| **Tool Execution** | Sequential (one at a time) |
| **Iteration Timeout** | None (relies on OpenRouter timeout) |
| **Max Response Time** | ~2-4 minutes (50 iterations × ~3s each) |

## Recommendations

For **most tasks**: Current config is perfect (50 iterations, no token limit)

For **very complex tasks**: Consider increasing to 100 iterations

For **simple tasks**: Frontend could pass a `maxIterations` parameter:
```typescript
fetch('/api/chat', {
  body: JSON.stringify({
    messages,
    projectId,
    userId,
    maxIterations: 20 // Override for simple tasks
  })
})
```

For **production**: Add monitoring and adjust based on actual usage patterns.
