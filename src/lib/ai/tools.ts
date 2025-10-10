import { z } from "zod";
import {
  createFile,
  updateFile,
  getProjectFiles,
} from "@/lib/appwrite/database";
import { getLanguageFromPath } from "@/lib/utils/fileSystem";
import { spawn } from "child_process";

const ALLOWED_COMMANDS = [
  "npm",
  "pnpm",
  "yarn",
  "npx",
  "bun",
  "node",
  "ls",
  "pwd",
  "cat",
  "mkdir",
  "touch",
  "git",
  "pnpmx",
  "npmx",
];

function parseCommand(input: string): { command: string; args: string[] } {
  const matches = input.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
  if (matches.length === 0) {
    return { command: "", args: [] };
  }

  const [command, ...rest] = matches;
  const cleanArgs = rest.map((arg) => arg.replace(/^['"]|['"]$/g, ""));

  return {
    command: command || "",
    args: cleanArgs,
  };
}

// Tool schemas
export const createFileSchema = z.object({
  path: z.string().describe("File path starting with / (e.g., /src/App.tsx)"),
  content: z.string().describe("File content"),
  type: z.enum(["file", "folder"]).default("file").describe("File type"),
});

export const updateFileSchema = z.object({
  path: z.string().describe("File path to update"),
  content: z.string().describe("New file content"),
});

export const deleteFileSchema = z.object({
  path: z.string().describe("File path to delete"),
});

export const listFilesSchema = z.object({
  projectId: z
    .string()
    .optional()
    .describe("Project ID to list files for. Defaults to the active project."),
});

export const runCommandSchema = z.object({
  command: z
    .string()
    .min(1)
    .describe(
      'Shell command to execute, e.g. "pnpm install" or "npm run dev". Only common project commands are allowed.'
    ),
  timeoutMs: z
    .number()
    .int()
    .positive()
    .max(5 * 60 * 1000)
    .default(2 * 60 * 1000)
    .describe(
      "Maximum time the command is allowed to run in milliseconds (default 2 minutes)."
    ),
});

// Tool implementations
export async function createFileTool(
  projectId: string,
  userId: string,
  { path, content, type }: z.infer<typeof createFileSchema>
) {
  try {
    const language = type === "file" ? getLanguageFromPath(path) : undefined;
    const normalizedContent = type === "file" ? content : undefined;

    const file = await createFile({
      projectId,
      userId,
      path,
      type,
      content: normalizedContent,
      language,
    });

    return {
      success: true,
      message: `${type === "file" ? "File" : "Folder"} created: ${path}`,
      file: {
        path: file.path,
        type: file.type,
        language: file.language,
      },
    };
  } catch (error: unknown) {
    console.error("Error creating file:", error);
    const err = error instanceof Error ? error : new Error('Unknown error');
    return {
      success: false,
      error: `Failed to create ${type}: ${err.message}`,
    };
  }
}

export async function updateFileTool(
  projectId: string,
  userId: string,
  { path, content }: z.infer<typeof updateFileSchema>
) {
  try {
    // Find the file by path
    const files = await getProjectFiles(projectId);
    const existingFile = files.find((f) => f.path === path);

    if (!existingFile) {
      // If file doesn't exist, create it
      return createFileTool(projectId, userId, { path, content, type: "file" });
    }

    const updatedFile = await updateFile(existingFile.$id, {
      content,
      language: getLanguageFromPath(path),
    });

    return {
      success: true,
      message: `File updated: ${path}`,
      file: {
        path: updatedFile.path,
        type: updatedFile.type,
        language: updatedFile.language,
      },
    };
  } catch (error: unknown) {
    console.error("Error updating file:", error);
    const err = error instanceof Error ? error : new Error('Unknown error');
    return {
      success: false,
      error: `Failed to update file: ${err.message}`,
    };
  }
}

export async function listFilesTool(projectId: string) {
  try {
    const files = await getProjectFiles(projectId);

    return {
      success: true,
      files: files.map((file) => ({
        path: file.path,
        type: file.type,
        language: file.language,
        size: file.size,
      })),
    };
  } catch (error: unknown) {
    console.error("Error listing files:", error);
    const err = error instanceof Error ? error : new Error('Unknown error');
    return {
      success: false,
      error: `Failed to list files: ${err.message}`,
    };
  }
}

export async function runCommandTool({
  command,
  timeoutMs,
}: z.infer<typeof runCommandSchema>) {
  const { command: executable, args } = parseCommand(command);

  if (!executable) {
    return {
      success: false,
      error: "No command provided.",
    };
  }

  if (!ALLOWED_COMMANDS.includes(executable)) {
    return {
      success: false,
      error: `Command "${executable}" is not allowed. Allowed commands: ${ALLOWED_COMMANDS.join(
        ", "
      )}`,
    };
  }

  const effectiveTimeout = timeoutMs ?? 2 * 60 * 1000;

  return await new Promise((resolve) => {
    try {
      const child = spawn(executable, args, {
        cwd: process.cwd(),
        shell: false,
        env: process.env,
      });

      let stdout = "";
      let stderr = "";
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
      }, effectiveTimeout);

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        clearTimeout(timer);
        resolve({
          success: !timedOut && code === 0,
          command: executable,
          args,
          exitCode: code,
          timedOut,
          stdout,
          stderr,
        });
      });

      child.on("error", (error) => {
        clearTimeout(timer);
        resolve({
          success: false,
          command: executable,
          args,
          exitCode: null,
          timedOut,
          stdout,
          stderr,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      resolve({
        success: false,
        command: executable,
        args,
        exitCode: null,
        timedOut: false,
        stdout: "",
        stderr: "",
        error: err.message,
      });
    }
  });
}

// AI Tools configuration for Vercel AI SDK
export const aiTools = {
  create_file: {
    description: "Create a new file or folder in the project",
    parameters: createFileSchema,
    execute: async (
      { path, content, type }: z.infer<typeof createFileSchema>,
      { projectId, userId }: { projectId: string; userId: string }
    ) => {
      return createFileTool(projectId, userId, { path, content, type });
    },
  },

  update_file: {
    description: "Update an existing file with new content",
    parameters: updateFileSchema,
    execute: async (
      { path, content }: z.infer<typeof updateFileSchema>,
      { projectId, userId }: { projectId: string; userId: string }
    ) => {
      return updateFileTool(projectId, userId, { path, content });
    },
  },

  list_files: {
    description: "List all files in the project",
    parameters: listFilesSchema,
    execute: async (
      { projectId }: z.infer<typeof listFilesSchema>,
      { projectId: contextProjectId }: { projectId: string; userId: string }
    ) => {
      return listFilesTool(projectId ?? contextProjectId);
    },
  },

  run_command: {
    description:
      "Execute a project command (e.g., install dependencies, start dev server)",
    parameters: runCommandSchema,
    execute: async ({
      command,
      timeoutMs,
    }: z.infer<typeof runCommandSchema>) => {
      return runCommandTool({ command, timeoutMs });
    },
  },
};
