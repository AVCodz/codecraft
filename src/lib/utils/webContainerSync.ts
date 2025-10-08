import ignore from 'ignore';
import type { WebContainer } from '@webcontainer/api';
import { Query } from 'appwrite';
import { createClientSideClient } from '@/lib/appwrite/config';
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite/config';
import { getLanguageFromPath } from '@/lib/utils/fileSystem';

/**
 * Default patterns to ignore (even if not in .gitignore)
 */
const DEFAULT_IGNORE_PATTERNS = [
  'node_modules',
  'dist',
  'dist-ssr',
  '.vscode',
  '.idea',
  '.DS_Store',
  '*.log',
  'npm-debug.log*',
  'yarn-debug.log*',
  'yarn-error.log*',
  'pnpm-debug.log*',
  'lerna-debug.log*',
  '*.local',
  '*.suo',
  '*.ntvs*',
  '*.njsproj',
  '*.sln',
  '*.sw?',
];

/**
 * Read .gitignore from WebContainer and parse patterns
 */
async function getIgnorePatterns(container: WebContainer): Promise<ReturnType<typeof ignore>> {
  const ig = ignore().add(DEFAULT_IGNORE_PATTERNS);

  try {
    const gitignoreContent = await container.fs.readFile('/.gitignore', 'utf-8');
    ig.add(gitignoreContent);
    console.log('[WebContainerSync] Loaded .gitignore patterns');
  } catch {
    console.log('[WebContainerSync] No .gitignore found, using defaults only');
  }

  return ig;
}

/**
 * Recursively list all files in WebContainer
 */
async function listAllFiles(
  container: WebContainer,
  dirPath: string = '/',
  ig: ReturnType<typeof ignore>
): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await container.fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = dirPath === '/' ? `/${entry.name}` : `${dirPath}/${entry.name}`;
      const relativePath = fullPath.startsWith('/') ? fullPath.slice(1) : fullPath;

      // Check if path should be ignored
      if (ig.ignores(relativePath)) {
        console.log(`[WebContainerSync] Ignoring: ${relativePath}`);
        continue;
      }

      if (entry.isDirectory()) {
        // Recursively list subdirectory
        const subFiles = await listAllFiles(container, fullPath, ig);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`[WebContainerSync] Error reading directory ${dirPath}:`, error);
  }

  return files;
}

/**
 * Sync a single file from WebContainer to Appwrite
 */
async function syncFileToAppwrite(
  container: WebContainer,
  filePath: string,
  projectId: string,
  userId: string,
  existingFiles: Map<string, any>
): Promise<boolean> {
  try {
    const { databases } = createClientSideClient();
    
    // Read file content from WebContainer
    const content = await container.fs.readFile(filePath, 'utf-8');
    const language = getLanguageFromPath(filePath);
    const fileName = filePath.split('/').pop() || filePath;

    const existingFile = existingFiles.get(filePath);

    if (existingFile) {
      // File exists in Appwrite, update it
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.PROJECT_FILES,
        existingFile.$id,
        {
          content,
          language,
          size: content.length,
          updatedAt: new Date().toISOString(),
        }
      );
      console.log(`[WebContainerSync] ✅ Updated: ${filePath}`);
    } else {
      // File doesn't exist in Appwrite, create it
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.PROJECT_FILES,
        'unique()',
        {
          projectId,
          userId,
          path: filePath,
          name: fileName,
          type: 'file',
          content,
          language,
          size: content.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      );
      console.log(`[WebContainerSync] ✅ Created: ${filePath}`);
    }

    return true;
  } catch (error) {
    console.error(`[WebContainerSync] ❌ Failed to sync ${filePath}:`, error);
    return false;
  }
}

/**
 * Sync all files from WebContainer to Appwrite
 */
export async function syncWebContainerToAppwrite(
  container: WebContainer,
  projectId: string,
  userId: string
): Promise<{ success: number; failed: number; total: number }> {
  console.log('[WebContainerSync] 🔄 Starting sync to Appwrite...');

  try {
    const { databases } = createClientSideClient();
    
    // Get ignore patterns
    const ig = await getIgnorePatterns(container);

    // Get all files from WebContainer
    const allFiles = await listAllFiles(container, '/', ig);
    console.log(`[WebContainerSync] Found ${allFiles.length} files to sync`);

    // Get existing files from Appwrite using client SDK
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECT_FILES,
      [Query.equal('projectId', projectId), Query.limit(1000)]
    );
    
    const existingFilesMap = new Map(
      response.documents.map((file: any) => [file.path, file])
    );

    // Sync each file
    let success = 0;
    let failed = 0;

    for (const filePath of allFiles) {
      const result = await syncFileToAppwrite(
        container,
        filePath,
        projectId,
        userId,
        existingFilesMap
      );

      if (result) {
        success++;
      } else {
        failed++;
      }
    }

    console.log(
      `[WebContainerSync] ✅ Sync complete: ${success} succeeded, ${failed} failed, ${allFiles.length} total`
    );

    return {
      success,
      failed,
      total: allFiles.length,
    };
  } catch (error) {
    console.error('[WebContainerSync] ❌ Sync failed:', error);
    throw error;
  }
}

/**
 * Sync a single file change to Appwrite
 * Used for real-time updates when files change
 */
export async function syncSingleFileToAppwrite(
  container: WebContainer,
  filePath: string,
  projectId: string,
  userId: string
): Promise<boolean> {
  console.log(`[WebContainerSync] Syncing file: ${filePath}`);

  try {
    const { databases } = createClientSideClient();
    
    // Get ignore patterns
    const ig = await getIgnorePatterns(container);

    // Check if file should be ignored
    const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    if (ig.ignores(relativePath)) {
      console.log(`[WebContainerSync] Ignoring: ${relativePath}`);
      return false;
    }

    // Get existing files using client SDK
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PROJECT_FILES,
      [Query.equal('projectId', projectId), Query.limit(1000)]
    );
    
    const existingFilesMap = new Map(
      response.documents.map((file: any) => [file.path, file])
    );

    // Sync the file
    return await syncFileToAppwrite(
      container,
      filePath,
      projectId,
      userId,
      existingFilesMap
    );
  } catch (error) {
    console.error(`[WebContainerSync] Failed to sync ${filePath}:`, error);
    return false;
  }
}
