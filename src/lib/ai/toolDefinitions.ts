/**
 * OpenRouter Tool Definitions for File Operations
 * These definitions follow the OpenRouter/OpenAI tool calling format
 * Updated for React + TypeScript + Tailwind projects with WebContainer support
 */

export const toolDefinitions = [
  {
    type: "function" as const,
    function: {
      name: "list_project_files",
      description:
        "List all files and folders in the React TypeScript project to understand the project structure. Use this before making file changes to see what already exists.",
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
        "Read the content of a specific file in the React TypeScript project. Always read a file before updating it to ensure you don't lose important code. Works with .tsx, .ts, .jsx, .js, .css, .json files.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              "The file path starting with / (e.g., /src/App.tsx, /src/components/Button.tsx, /src/index.css, /package.json, /tailwind.config.js).",
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
        "Create a new file in the React TypeScript project. Supports React components (.tsx), TypeScript files (.ts), stylesheets (.css), and config files. The file will be automatically synced with WebContainer.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              "File path starting with / (e.g., /src/components/Button.tsx, /src/hooks/useAuth.ts, /src/styles/button.css). Supports nested folders.",
          },
          content: {
            type: "string",
            description:
              "Complete file content. For React components, include proper TypeScript types and Tailwind CSS classes. Write production-ready, clean, well-commented code.",
          },
          description: {
            type: "string",
            description:
              "Brief explanation of what this file does (max 100 characters).",
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
        "Update an existing file with new content. This completely replaces the file content and syncs with WebContainer. Always read the file first to understand what needs to be changed. HMR (Hot Module Replacement) will automatically refresh the preview.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              "File path to update, starting with / (e.g., /src/App.tsx, /src/components/Header.tsx)",
          },
          content: {
            type: "string",
            description:
              "Complete new file content with proper TypeScript types and Tailwind CSS. Include ALL code, not just the changes.",
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
        "Delete a file from the project and remove it from WebContainer. Use with caution. Make sure this is what the user wants before deleting.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "File path to delete, starting with / (e.g., /src/components/OldComponent.tsx)",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "install_dependencies",
      description:
        "Install npm dependencies in the WebContainer. Use this when you need to add new packages to package.json. This runs 'npm install' automatically in the browser.",
      parameters: {
        type: "object",
        properties: {
          packages: {
            type: "array",
            items: { type: "string" },
            description: "Array of package names to install (e.g., ['axios', 'react-router-dom']). Leave empty to install all dependencies from package.json.",
          },
          dev: {
            type: "boolean",
            description: "Whether to install as devDependencies (--save-dev)",
            default: false,
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_files",
      description:
        "FAST filename-based search with fuzzy matching. Use this FIRST when user mentions a file/component name. Examples: 'tech stack' finds TechStack.tsx, 'button' finds Button.tsx and button.css, 'auth' finds useAuth.ts. Much faster than reading files one-by-one!",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Search term for filename matching. Can be partial. Examples: 'tech', 'TechStack', 'stack', 'Button', 'auth'. Case-insensitive fuzzy matching.",
          },
          extensions: {
            type: "array",
            items: { type: "string" },
            description:
              "Optional: Filter results by file extensions. Examples: ['.tsx', '.ts'], ['.css'], ['.json']. Leave empty to search all file types.",
          },
          maxResults: {
            type: "number",
            description: "Maximum number of results to return. Default: 10",
            default: 10,
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "find_in_files",
      description:
        "Search for text/code INSIDE file contents (like grep). Use when: (1) search_files found nothing, (2) need to find WHERE specific code/text exists, (3) searching for imports, functions, or code patterns. Slower than search_files but searches file contents. Supports regex patterns.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Text or regex pattern to search in file contents. Examples: 'useAuth' (find hook usage), 'tech stack' (find text), 'import.*Button' (regex for imports), 'function.*handleClick'.",
          },
          isRegex: {
            type: "boolean",
            description:
              "Whether query is a regex pattern. Default: false (plain text search). Set true for patterns like 'import.*Button' or 'function.*Auth'.",
            default: false,
          },
          caseSensitive: {
            type: "boolean",
            description: "Case-sensitive search. Default: false (case-insensitive).",
            default: false,
          },
          extensions: {
            type: "array",
            items: { type: "string" },
            description:
              "Optional: Only search files with these extensions. Examples: ['.tsx', '.ts'], ['.css']. Leave empty to search all text files.",
          },
          maxResults: {
            type: "number",
            description: "Maximum number of matching files to return. Default: 20",
            default: 20,
          },
        },
        required: ["query"],
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
  | "delete_file"
  | "install_dependencies"
  | "search_files"
  | "find_in_files";

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
