import { z } from 'zod';
import { createFile, updateFile, getProjectFiles } from '@/lib/appwrite/database';
import { getLanguageFromPath } from '@/lib/utils/fileSystem';

// Tool schemas
export const createFileSchema = z.object({
  path: z.string().describe('File path starting with / (e.g., /src/App.tsx)'),
  content: z.string().describe('File content'),
  type: z.enum(['file', 'folder']).default('file').describe('File type'),
});

export const updateFileSchema = z.object({
  path: z.string().describe('File path to update'),
  content: z.string().describe('New file content'),
});

export const deleteFileSchema = z.object({
  path: z.string().describe('File path to delete'),
});

export const listFilesSchema = z.object({
  projectId: z.string().describe('Project ID to list files for'),
});

// Tool implementations
export async function createFileTool(
  projectId: string,
  { path, content, type }: z.infer<typeof createFileSchema>
) {
  try {
    const language = type === 'file' ? getLanguageFromPath(path) : undefined;
    
    const file = await createFile({
      projectId,
      path,
      type,
      content: type === 'file' ? content : undefined,
      language,
    });
    
    return {
      success: true,
      message: `${type === 'file' ? 'File' : 'Folder'} created: ${path}`,
      file: {
        path: file.path,
        type: file.type,
        language: file.language,
      },
    };
  } catch (error: any) {
    console.error('Error creating file:', error);
    return {
      success: false,
      error: `Failed to create ${type}: ${error.message}`,
    };
  }
}

export async function updateFileTool(
  projectId: string,
  { path, content }: z.infer<typeof updateFileSchema>
) {
  try {
    // Find the file by path
    const files = await getProjectFiles(projectId);
    const existingFile = files.find(f => f.path === path);
    
    if (!existingFile) {
      // If file doesn't exist, create it
      return createFileTool(projectId, { path, content, type: 'file' });
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
  } catch (error: any) {
    console.error('Error updating file:', error);
    return {
      success: false,
      error: `Failed to update file: ${error.message}`,
    };
  }
}

export async function listFilesTool(projectId: string) {
  try {
    const files = await getProjectFiles(projectId);
    
    return {
      success: true,
      files: files.map(file => ({
        path: file.path,
        type: file.type,
        language: file.language,
        size: file.size,
      })),
    };
  } catch (error: any) {
    console.error('Error listing files:', error);
    return {
      success: false,
      error: `Failed to list files: ${error.message}`,
    };
  }
}

// AI Tools configuration for Vercel AI SDK
export const aiTools = {
  create_file: {
    description: 'Create a new file or folder in the project',
    parameters: createFileSchema,
    execute: async ({ path, content, type }: z.infer<typeof createFileSchema>, { projectId }: { projectId: string }) => {
      return createFileTool(projectId, { path, content, type });
    },
  },
  
  update_file: {
    description: 'Update an existing file with new content',
    parameters: updateFileSchema,
    execute: async ({ path, content }: z.infer<typeof updateFileSchema>, { projectId }: { projectId: string }) => {
      return updateFileTool(projectId, { path, content });
    },
  },
  
  list_files: {
    description: 'List all files in the project',
    parameters: listFilesSchema,
    execute: async ({ projectId }: z.infer<typeof listFilesSchema>) => {
      return listFilesTool(projectId);
    },
  },
};
