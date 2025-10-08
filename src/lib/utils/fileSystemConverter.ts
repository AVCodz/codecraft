import type { FileSystemTree } from '@/lib/types/webcontainer';

/**
 * Convert Appwrite file documents to WebContainer FileSystemTree format
 */
export function convertAppwriteFilesToFileSystemTree(documents: any[]): FileSystemTree {
  const tree: FileSystemTree = {};

  // Group files by directory structure
  for (const doc of documents) {
    const path = doc.path as string;
    const content = doc.content as string;

    if (!path || path === '/') continue;

    // Remove leading slash
    const relativePath = path.startsWith('/') ? path.slice(1) : path;
    
    // Split path into parts
    const parts = relativePath.split('/');
    
    // Build nested structure
    let current: any = tree;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLastPart = i === parts.length - 1;
      
      if (isLastPart) {
        // This is a file
        current[part] = {
          file: {
            contents: content || '',
          },
        };
      } else {
        // This is a directory
        if (!current[part]) {
          current[part] = {
            directory: {},
          };
        }
        
        // Move into the directory
        current = current[part].directory;
      }
    }
  }

  return tree;
}

/**
 * Example usage:
 * 
 * Input (Appwrite documents):
 * [
 *   { path: '/src/App.tsx', content: '...' },
 *   { path: '/src/main.tsx', content: '...' },
 *   { path: '/package.json', content: '...' }
 * ]
 * 
 * Output (FileSystemTree):
 * {
 *   'package.json': { file: { contents: '...' } },
 *   'src': {
 *     directory: {
 *       'App.tsx': { file: { contents: '...' } },
 *       'main.tsx': { file: { contents: '...' } }
 *     }
 *   }
 * }
 */
