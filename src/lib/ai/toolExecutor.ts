/**
 * Tool Executor for OpenRouter Tool Calling
 * Executes the actual file operations based on LLM tool call requests
 */

import { ToolCall, ToolResult, ToolName } from "./toolDefinitions";
import {
  createFile,
  updateFile,
  deleteFile,
  getProjectFiles,
} from "@/lib/appwrite/database";
import { getLanguageFromPath } from "@/lib/utils/fileSystem";

interface ExecutionContext {
  projectId: string;
  userId: string;
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

    // Check for nested paths (currently not supported)
    if (path.includes("/", 1)) {
      return {
        success: false,
        error: "Nested paths are not supported. Use root files only (e.g., /file.html)",
      };
    }

    // Check file extension
    if (!path.match(/\.(html|css|js)$/i)) {
      return {
        success: false,
        error: "Only .html, .css, and .js files are allowed at this stage",
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

    // Create the file
    const language = getLanguageFromPath(path);
    const file = await createFile({
      projectId: context.projectId,
      userId: context.userId,
      path,
      type: "file",
      content,
      language,
    });

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

    // Update the file
    const language = getLanguageFromPath(path);
    const updatedFile = await updateFile(existingFile.$id, {
      content,
      language,
    });

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

    // Delete the file
    await deleteFile(existingFile.$id);

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
