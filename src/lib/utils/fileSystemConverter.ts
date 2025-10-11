/**
 * FILE SYSTEM CONVERTER - Optimized conversion between storage formats
 * 
 * Purpose: Convert Appwrite flat files to WebContainer's FileSystemTree format (O(n) complexity)
 * Used by: WebContainer initialization, template loading
 * Key Features: Efficient tree building, directory structure creation, file/folder handling
 */

import type { FileSystemTree } from "@/lib/types/webcontainer";
export function convertAppwriteFilesToFileSystemTree(
  documents: Array<{ path: string; content?: string }>
): FileSystemTree {
  console.time("⏱️  File Conversion");
  console.log(`[FileConverter] 🔄 Converting ${documents.length} files...`);

  const tree: FileSystemTree = {};

  // Sort files by path for more efficient tree building
  const sortedDocs = [...documents].sort((a, b) => {
    const pathA = (a.path as string) || "";
    const pathB = (b.path as string) || "";
    return pathA.localeCompare(pathB);
  });

  // Build tree in single pass
  for (const doc of sortedDocs) {
    const path = doc.path as string;
    const content = doc.content as string;

    if (!path || path === "/") continue;

    // Remove leading slash
    const relativePath = path.startsWith("/") ? path.slice(1) : path;

    // Split path into parts
    const parts = relativePath.split("/");

    // Build nested structure
    let current: Record<string, unknown> = tree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLastPart = i === parts.length - 1;

      if (isLastPart) {
        // This is a file
        current[part] = {
          file: {
            contents: content || "",
          },
        };
      } else {
        // This is a directory - create if doesn't exist
        if (!current[part]) {
          current[part] = {
            directory: {},
          };
        }

        // Move into the directory
        current = (current[part] as any).directory;
      }
    }
  }

  console.timeEnd("⏱️  File Conversion");
  console.log(
    `[FileConverter] ✅ Converted to FileSystemTree with ${
      Object.keys(tree).length
    } root entries`
  );

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
