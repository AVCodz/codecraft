/**
 * OpenRouter Tool Definitions for File Operations
 * These definitions follow the OpenRouter/OpenAI tool calling format
 */

export const toolDefinitions = [
  {
    type: "function" as const,
    function: {
      name: "list_project_files",
      description:
        "List all files and folders in the current project to understand the project structure. Use this before making file changes to see what already exists.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "read_file",
      description:
        "Read the content of a specific file to understand its current implementation. Always read a file before updating it to ensure you don't lose important code.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              "The file path starting with / (e.g., /index.html, /styles.css, /app.js). Must be a root-level file.",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_file",
      description:
        "Create a new file in the project. Only use this for files that don't exist yet. Currently supports only root-level .html, .css, and .js files.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              "File path starting with / (e.g., /index.html, /styles.css, /app.js). Must be at root level (no folders) and must end with .html, .css, or .js",
          },
          content: {
            type: "string",
            description:
              "Complete file content. Write production-ready, clean, well-commented code.",
          },
          description: {
            type: "string",
            description:
              "Brief explanation of what this file does and why you're creating it (max 100 characters).",
          },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_file",
      description:
        "Update an existing file with new content. This completely replaces the file content. Always read the file first to understand what needs to be changed.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              "File path to update, starting with / (e.g., /index.html)",
          },
          content: {
            type: "string",
            description:
              "Complete new file content. Include ALL code, not just the changes.",
          },
          description: {
            type: "string",
            description:
              "Brief explanation of what changed and why (max 100 characters).",
          },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "delete_file",
      description:
        "Delete a file from the project. Use with caution. Make sure this is what the user wants before deleting.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "File path to delete, starting with / (e.g., /old-file.js)",
          },
        },
        required: ["path"],
      },
    },
  },
] as const;

// Type exports for TypeScript
export type ToolName =
  | "list_project_files"
  | "read_file"
  | "create_file"
  | "update_file"
  | "delete_file";

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: ToolName;
    arguments: string; // JSON string
  };
}

export interface ToolResult {
  role: "tool";
  tool_call_id: string;
  name: ToolName;
  content: string; // JSON string
}
