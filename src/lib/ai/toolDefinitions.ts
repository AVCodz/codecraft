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
  {
    type: "function" as const,
    function: {
      name: "web_search",
      description:
        "Search the web for up-to-date information, documentation, or solutions. Use this when the user asks to search for something online, needs latest documentation, or shares a URL to fetch. Returns relevant web results with content.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Search query or URL to fetch. Examples: 'latest React 19 features', 'Next.js App Router documentation', 'https://example.com/docs'",
          },
          numResults: {
            type: "number",
            description: "Number of search results to return (default: 5, max: 10)",
            default: 5,
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_code_context",
      description:
        "Search for relevant code snippets, examples, and documentation from open source libraries, GitHub repositories, and programming frameworks. Perfect for finding up-to-date code documentation, implementation examples, API usage patterns, and best practices. Use when user needs code examples or library documentation.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Code-related search query. Examples: 'React useState hook examples', 'Next.js API routes', 'Tailwind CSS grid layouts', 'TypeScript generics tutorial'",
          },
          tokensNum: {
            type: "number",
            description:
              "Number of tokens of context to return (1000-50000). Default: 5000. Use higher values for comprehensive documentation.",
            default: 5000,
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "crawl_url",
      description:
        "Extract and crawl content from a specific URL. ALWAYS use this tool first when the user provides any URL (like https://example.com). Perfect for fetching portfolio websites, documentation pages, articles, or any web page content. Returns the full text content of the URL. If crawling fails, explain the error to the user.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description:
              "The full URL to crawl and extract content from. Must start with http:// or https://. Examples: 'https://example.com', 'https://portfolio.dev', 'https://docs.example.com/api'",
          },
          maxCharacters: {
            type: "number",
            description:
              "Maximum characters to extract from the page (default: 3000). Use higher values for longer content.",
            default: 3000,
          },
        },
        required: ["url"],
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
  | "search_files"
  | "find_in_files"
  | "web_search"
  | "get_code_context"
  | "crawl_url";

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
