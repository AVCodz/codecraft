# Frontend Integration Guide

## File Refresh Mechanism

When files are created or updated via the chat API, the response stream now includes special markers that the frontend should watch for to refresh the file list and editor.

## Stream Format

The chat API streams text responses with special markers:

```
[LLM explanation text]

🔧 Executing: create_file
✅ Successfully created /index.html
[FILE_UPDATED:/index.html]

🔧 Executing: update_file
✅ Successfully updated /styles.css
[FILE_UPDATED:/styles.css]

[More LLM text]
```

## Frontend Implementation

### 1. Parse the Stream

Watch for the `[FILE_UPDATED:path]` markers in the stream:

```typescript
// In your chat component
const handleStreamResponse = async (response: Response) => {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) return;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);

    // Look for file update markers
    const fileUpdateRegex = /\[FILE_UPDATED:([^\]]+)\]/g;
    let match;

    while ((match = fileUpdateRegex.exec(chunk)) !== null) {
      const filePath = match[1];
      console.log('File updated:', filePath);

      // Trigger file list refresh
      await refreshProjectFiles();

      // If this file is currently open in editor, refresh it
      if (currentOpenFile === filePath) {
        await loadFileContent(filePath);
      }
    }

    // Remove the markers before displaying to user
    const displayText = chunk.replace(/\[FILE_UPDATED:[^\]]+\]/g, '');

    // Add to chat display
    appendToChat(displayText);
  }
};
```

### 2. Refresh Project Files

```typescript
// Function to refresh the file list
const refreshProjectFiles = async () => {
  try {
    const response = await fetch(`/api/projects/${projectId}/files`);
    const files = await response.json();

    // Update your file tree state
    setProjectFiles(files);

    // If preview is open, refresh it
    if (isPreviewOpen) {
      refreshPreview();
    }
  } catch (error) {
    console.error('Failed to refresh files:', error);
  }
};
```

### 3. Reload Open File in Editor

```typescript
// If the currently open file was updated, reload it
const loadFileContent = async (filePath: string) => {
  try {
    const response = await fetch(`/api/projects/${projectId}/files?path=${filePath}`);
    const fileData = await response.json();

    // Update editor content
    setEditorContent(fileData.content);
  } catch (error) {
    console.error('Failed to load file:', error);
  }
};
```

### 4. Refresh Preview

```typescript
// Refresh the preview iframe
const refreshPreview = () => {
  const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
  if (iframe) {
    // Force reload the preview
    iframe.src = iframe.src;
  }
};
```

## Complete Example

Here's a complete example of integrating file updates into your chat component:

```typescript
import { useState, useEffect, useRef } from 'react';
import { useProjectStore } from '@/lib/stores/projectStore';

export function ChatInterface({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const { refreshFiles, currentFile, loadFile } = useProjectStore();

  const sendMessage = async (content: string) => {
    setIsStreaming(true);

    const newMessages = [...messages, { role: 'user', content }];
    setMessages(newMessages);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          projectId,
          userId: 'user-id',
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      let assistantMessage = '';
      let updatedFiles = new Set<string>();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);

        // Extract file update markers
        const fileUpdateRegex = /\[FILE_UPDATED:([^\]]+)\]/g;
        let match;

        while ((match = fileUpdateRegex.exec(chunk)) !== null) {
          const filePath = match[1];
          updatedFiles.add(filePath);
        }

        // Remove markers from display text
        const displayText = chunk.replace(/\[FILE_UPDATED:[^\]]+\]/g, '');
        assistantMessage += displayText;

        // Update UI with streaming text
        setMessages([
          ...newMessages,
          { role: 'assistant', content: assistantMessage, isStreaming: true }
        ]);
      }

      // Streaming complete
      setMessages([
        ...newMessages,
        { role: 'assistant', content: assistantMessage, isStreaming: false }
      ]);

      // Refresh files if any were updated
      if (updatedFiles.size > 0) {
        console.log('Files updated:', Array.from(updatedFiles));
        await refreshFiles(projectId);

        // Reload currently open file if it was updated
        if (currentFile && updatedFiles.has(currentFile.path)) {
          await loadFile(projectId, currentFile.path);
        }
      }

    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="chat-interface">
      {/* Your chat UI here */}
    </div>
  );
}
```

## Project Store Integration

Update your project store to include refresh methods:

```typescript
// src/lib/stores/projectStore.ts
import { create } from 'zustand';

interface ProjectStore {
  files: ProjectFile[];
  currentFile: ProjectFile | null;

  refreshFiles: (projectId: string) => Promise<void>;
  loadFile: (projectId: string, path: string) => Promise<void>;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  files: [],
  currentFile: null,

  refreshFiles: async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/files`);
      const files = await response.json();
      set({ files });
    } catch (error) {
      console.error('Failed to refresh files:', error);
    }
  },

  loadFile: async (projectId: string, path: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/files?path=${path}`);
      const file = await response.json();
      set({ currentFile: file });
    } catch (error) {
      console.error('Failed to load file:', error);
    }
  },
}));
```

## Debouncing Refreshes

If multiple files are updated in quick succession, debounce the refresh calls:

```typescript
import { debounce } from 'lodash'; // or implement your own

const debouncedRefresh = debounce(async () => {
  await refreshProjectFiles();
}, 500); // Wait 500ms after last update

// In your stream handler
if (filePath) {
  updatedFiles.add(filePath);
  debouncedRefresh();
}
```

## Error Handling

Handle cases where file refresh fails:

```typescript
const refreshProjectFiles = async () => {
  try {
    const response = await fetch(`/api/projects/${projectId}/files`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const files = await response.json();
    setProjectFiles(files);
  } catch (error) {
    console.error('Failed to refresh files:', error);

    // Show user-friendly error
    toast.error('Failed to refresh files. Please refresh the page.');
  }
};
```

## Testing

Test the integration:

1. **Create a file**: Send "Create a todo app" and verify:
   - Stream shows file creation
   - File list updates automatically
   - File appears in file tree

2. **Update a file**: Send "Add dark mode" and verify:
   - Stream shows file updates
   - Open file in editor reloads
   - Preview refreshes

3. **Error case**: Disconnect from network during stream and verify:
   - Error is caught gracefully
   - User sees helpful error message
   - Can retry the operation

## Summary

| Event | Stream Marker | Frontend Action |
|-------|--------------|-----------------|
| File created | `[FILE_UPDATED:/path.html]` | Refresh file list |
| File updated | `[FILE_UPDATED:/path.css]` | Reload if open in editor |
| Multiple files | Multiple markers | Debounce refresh calls |

The frontend should:
1. ✅ Parse stream for `[FILE_UPDATED:path]` markers
2. ✅ Remove markers before displaying to user
3. ✅ Refresh file list when files change
4. ✅ Reload editor if current file updated
5. ✅ Refresh preview if needed
6. ✅ Debounce multiple refreshes
7. ✅ Handle errors gracefully
