/**
 * Tool Executor for OpenRouter Tool Calling
 * Executes the actual file operations based on LLM tool call requests
 * Updated for WebContainer support
 */

import { ToolCall, ToolResult, ToolName } from "./toolDefinitions";
import {
  createFile,
  updateFile,
  deleteFile,
  getProjectFiles,
} from "@/lib/appwrite/database";
import { getLanguageFromPath } from "@/lib/utils/fileSystem";
import type { WebContainer } from '@webcontainer/api';

interface ExecutionContext {
  projectId: string;
  userId: string;
  webContainer?: WebContainer | null;
}

/**
 * Execute a tool call and return the result
 */
export async function executeToolCall(
  toolCall: ToolCall,
  context: ExecutionContext
): Promise<ToolResult> {
  const { id, function: func } = toolCall;
  const toolName = func.name as ToolName;

  // Log context for debugging
  console.log(`[ToolExecutor] 🔧 Executing ${toolName} for project:`, context.projectId);

  try {
    // Parse arguments
    let args: any;
    try {
      args = JSON.parse(func.arguments);
    } catch (error) {
      return {
        role: "tool",
        tool_call_id: id,
        name: toolName,
        content: JSON.stringify({
          success: false,
          error: "Invalid JSON arguments",
        }),
      };
    }

    // Execute the appropriate tool
    let result: any;

    switch (toolName) {
      case "list_project_files":
        result = await listProjectFilesExecutor(context);
        break;

      case "read_file":
        result = await readFileExecutor(args.path, context);
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
        result = await deleteFileExecutor(args.path, context);
        break;

      case "install_dependencies":
        result = await installDependenciesExecutor(
          args.packages || [],
          args.dev || false,
          context
        );
        break;

      case "search_files":
        result = await searchFilesExecutor(
          args.query,
          args.extensions,
          args.maxResults || 10,
          context
        );
        break;

      case "find_in_files":
        result = await findInFilesExecutor(
          args.query,
          args.isRegex || false,
          args.caseSensitive || false,
          args.extensions,
          args.maxResults || 20,
          context
        );
        break;

      default:
        result = {
          success: false,
          error: `Unknown tool: ${toolName}`,
        };
    }

    // Ensure result is serializable
    let contentString: string;
    try {
      contentString = JSON.stringify(result);
      // Verify it's valid JSON by parsing it back
      JSON.parse(contentString);
    } catch (stringifyError: any) {
      console.error(`[ToolExecutor] Failed to stringify result for ${toolName}:`, stringifyError);
      contentString = JSON.stringify({
        success: false,
        error: "Failed to serialize tool result"
      });
    }

    return {
      role: "tool",
      tool_call_id: id,
      name: toolName,
      content: contentString,
    };
  } catch (error: any) {
    console.error(`[ToolExecutor] Error executing ${toolName}:`, error);
    return {
      role: "tool",
      tool_call_id: id,
      name: toolName,
      content: JSON.stringify({
        success: false,
        error: error.message || "Unknown error occurred",
      }),
    };
  }
}

/**
 * List all files in the project
 */
async function listProjectFilesExecutor(context: ExecutionContext) {
  try {
    const files = await getProjectFiles(context.projectId);

    return {
      success: true,
      files: files.map((file) => ({
        path: file.path,
        name: file.name,
        type: file.type,
        language: file.language,
        size: file.size,
        updatedAt: file.updatedAt,
      })),
      totalFiles: files.length,
      message: `Found ${files.length} files in the project`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to list files: ${error.message}`,
    };
  }
}

/**
 * Read a file's content
 */
async function readFileExecutor(path: string, context: ExecutionContext) {
  try {
    // Validate path
    if (!path || !path.startsWith("/")) {
      return {
        success: false,
        error: "Path must start with /",
      };
    }

    const files = await getProjectFiles(context.projectId);
    const file = files.find((f) => f.path === path);

    if (!file) {
      return {
        success: false,
        error: `File not found: ${path}`,
        availableFiles: files.map((f) => f.path),
      };
    }

    return {
      success: true,
      file: {
        path: file.path,
        name: file.name,
        type: file.type,
        content: file.content || "",
        language: file.language,
        size: file.size,
        updatedAt: file.updatedAt,
      },
      message: `Successfully read ${path}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to read file: ${error.message}`,
    };
  }
}

/**
 * Create a new file
 */
async function createFileExecutor(
  path: string,
  content: string,
  description: string | undefined,
  context: ExecutionContext
) {
  try {
    // Validate path
    if (!path || !path.startsWith("/")) {
      return {
        success: false,
        error: "Path must start with /",
      };
    }

    // Check if file already exists
    const files = await getProjectFiles(context.projectId);
    const existingFile = files.find((f) => f.path === path);

    if (existingFile) {
      return {
        success: false,
        error: `File already exists: ${path}. Use update_file instead`,
      };
    }

    // Create the file in database
    const language = getLanguageFromPath(path);
    const file = await createFile({
      projectId: context.projectId,
      userId: context.userId,
      path,
      type: "file",
      content,
      language,
    });

    // Sync to WebContainer if available
    if (context.webContainer) {
      try {
        // Create parent directories if needed
        const dirPath = path.substring(0, path.lastIndexOf('/'));
        if (dirPath && dirPath !== '/') {
          await context.webContainer.fs.mkdir(dirPath, { recursive: true });
        }
        await context.webContainer.fs.writeFile(path, content);
        console.log(`[ToolExecutor] ✅ Synced to WebContainer: ${path}`);
      } catch (err) {
        console.warn(`[ToolExecutor] ⚠️ Failed to sync to WebContainer: ${path}`, err);
      }
    }

    return {
      success: true,
      file: {
        path: file.path,
        name: file.name,
        type: file.type,
        language: file.language,
        size: file.size,
      },
      message: `Successfully created ${path}`,
      description: description || undefined,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to create file: ${error.message}`,
    };
  }
}

/**
 * Update an existing file
 */
async function updateFileExecutor(
  path: string,
  content: string,
  description: string | undefined,
  context: ExecutionContext
) {
  try {
    // Validate path
    if (!path || !path.startsWith("/")) {
      return {
        success: false,
        error: "Path must start with /",
      };
    }

    // Find the file
    const files = await getProjectFiles(context.projectId);
    const existingFile = files.find((f) => f.path === path);

    if (!existingFile) {
      // File doesn't exist, create it instead
      return await createFileExecutor(path, content, description, context);
    }

    // Update the file in database
    const language = getLanguageFromPath(path);
    const updatedFile = await updateFile(existingFile.$id, {
      content,
      language,
    });

    // Sync to WebContainer if available
    if (context.webContainer) {
      try {
        await context.webContainer.fs.writeFile(path, content);
        console.log(`[ToolExecutor] ✅ Updated in WebContainer: ${path}`);
      } catch (err) {
        console.warn(`[ToolExecutor] ⚠️ Failed to update in WebContainer: ${path}`, err);
      }
    }

    return {
      success: true,
      file: {
        path: updatedFile.path,
        name: updatedFile.name,
        type: updatedFile.type,
        language: updatedFile.language,
        size: updatedFile.size,
      },
      message: `Successfully updated ${path}`,
      description: description || undefined,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to update file: ${error.message}`,
    };
  }
}

/**
 * Delete a file
 */
async function deleteFileExecutor(path: string, context: ExecutionContext) {
  try {
    // Validate path
    if (!path || !path.startsWith("/")) {
      return {
        success: false,
        error: "Path must start with /",
      };
    }

    // Find the file
    const files = await getProjectFiles(context.projectId);
    const existingFile = files.find((f) => f.path === path);

    if (!existingFile) {
      return {
        success: false,
        error: `File not found: ${path}`,
      };
    }

    // Delete from database
    await deleteFile(existingFile.$id);

    // Delete from WebContainer if available
    if (context.webContainer) {
      try {
        await context.webContainer.fs.rm(path, { force: true });
        console.log(`[ToolExecutor] ✅ Deleted from WebContainer: ${path}`);
      } catch (err) {
        console.warn(`[ToolExecutor] ⚠️ Failed to delete from WebContainer: ${path}`, err);
      }
    }

    return {
      success: true,
      message: `Successfully deleted ${path}`,
      deletedFile: {
        path: existingFile.path,
        name: existingFile.name,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to delete file: ${error.message}`,
    };
  }
}

/**
 * Search for files by filename (fast fuzzy matching)
 */
async function searchFilesExecutor(
  query: string,
  extensions: string[] | undefined,
  maxResults: number,
  context: ExecutionContext
) {
  try {
    console.log(`[ToolExecutor] 🔍 Searching files for: "${query}"`);

    const files = await getProjectFiles(context.projectId);
    const queryLower = query.toLowerCase();

    // Fuzzy match on filename
    const matches = files
      .filter(file => {
        const fileName = file.name.toLowerCase();
        const filePath = file.path.toLowerCase();
        
        // Extension filter
        if (extensions && extensions.length > 0) {
          const hasExtension = extensions.some(ext => file.path.endsWith(ext));
          if (!hasExtension) return false;
        }
        
        // Fuzzy match: check if all characters of query appear in order
        let queryIndex = 0;
        for (const char of fileName) {
          if (char === queryLower[queryIndex]) {
            queryIndex++;
            if (queryIndex === queryLower.length) return true;
          }
        }
        
        // Also match on full path (less strict)
        return filePath.includes(queryLower);
      })
      .slice(0, maxResults)
      .map(file => ({
        path: file.path,
        name: file.name,
        type: file.type,
        language: file.language,
        size: file.size,
      }));

    return {
      success: true,
      results: matches,
      count: matches.length,
      message: `Found ${matches.length} file(s) matching "${query}"`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Search failed: ${error.message}`,
    };
  }
}

/**
 * Find text/code inside file contents (grep-like)
 */
async function findInFilesExecutor(
  query: string,
  isRegex: boolean,
  caseSensitive: boolean,
  extensions: string[] | undefined,
  maxResults: number,
  context: ExecutionContext
) {
  try {
    console.log(`[ToolExecutor] 🔎 Searching in file contents for: "${query}"`);

    const files = await getProjectFiles(context.projectId);
    
    // Create search pattern
    const pattern = isRegex
      ? new RegExp(query, caseSensitive ? 'g' : 'gi')
      : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'gi');

    const matches = [];

    for (const file of files) {
      if (file.type !== 'file' || !file.content) continue;

      // Extension filter
      if (extensions && extensions.length > 0) {
        const hasExtension = extensions.some(ext => file.path.endsWith(ext));
        if (!hasExtension) continue;
      }

      // Search in content
      const contentMatches = file.content.match(pattern);
      
      if (contentMatches && contentMatches.length > 0) {
        // Get line numbers for matches
        const lines = file.content.split('\n');
        const matchedLines: { line: number; text: string; }[] = [];
        
        lines.forEach((lineText, index) => {
          if (pattern.test(lineText)) {
            matchedLines.push({
              line: index + 1,
              text: lineText.trim()
            });
          }
          pattern.lastIndex = 0; // Reset regex
        });

        matches.push({
          path: file.path,
          name: file.name,
          matchCount: contentMatches.length,
          lines: matchedLines.slice(0, 5), // Show first 5 matching lines
        });

        if (matches.length >= maxResults) break;
      }
    }

    return {
      success: true,
      results: matches,
      count: matches.length,
      message: `Found "${query}" in ${matches.length} file(s)`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Content search failed: ${error.message}`,
    };
  }
}

/**
 * Install dependencies in WebContainer
 */
async function installDependenciesExecutor(
  packages: string[],
  dev: boolean,
  context: ExecutionContext
) {
  try {
    if (!context.webContainer) {
      return {
        success: false,
        error: "WebContainer not available. Dependencies can only be installed in browser.",
      };
    }

    const args = packages.length > 0
      ? ['install', ...(dev ? ['-D'] : []), ...packages]
      : ['install'];

    console.log(`[ToolExecutor] 📦 Installing dependencies: npm ${args.join(' ')}`);

    const process = await context.webContainer.spawn('npm', args);
    const exitCode = await process.exit;

    if (exitCode === 0) {
      return {
        success: true,
        message: packages.length > 0
          ? `Installed: ${packages.join(', ')}`
          : 'All dependencies installed',
        packages,
        dev,
      };
    } else {
      return {
        success: false,
        error: `npm install failed with exit code ${exitCode}`,
      };
    }
  } catch (error: any) {
    console.error('[ToolExecutor] ❌ Failed to install dependencies:', error);
    return {
      success: false,
      error: `Failed to install dependencies: ${error.message}`,
    };
  }
}
