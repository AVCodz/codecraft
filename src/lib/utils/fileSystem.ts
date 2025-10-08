import { FileNode, ProjectFile, SupportedLanguage } from '@/lib/types';

// Convert flat file list to tree structure
export function buildFileTree(files: ProjectFile[]): FileNode[] {
  console.log(`[FileSystem] 🌳 Building file tree from ${files.length} files...`);
  const tree: FileNode[] = [];
  const pathMap = new Map<string, FileNode>();

  // Sort files by path depth first, then alphabetically
  const sortedFiles = files.sort((a, b) => {
    const depthA = a.path.split('/').length;
    const depthB = b.path.split('/').length;
    if (depthA !== depthB) return depthA - depthB;
    return a.path.localeCompare(b.path);
  });

  // Helper to ensure all parent folders exist
  const ensureParentFolders = (filePath: string): void => {
    const parts = filePath.split('/').filter(Boolean);
    
    // Build folder chain from root to parent (e.g., /src, then /src/components)
    for (let i = 0; i < parts.length - 1; i++) {
      const folderPath = '/' + parts.slice(0, i + 1).join('/');
      
      // Skip if folder already exists in map
      if (pathMap.has(folderPath)) continue;
      
      // Create virtual folder node
      const folderNode = createFolderNode(folderPath);
      pathMap.set(folderPath, folderNode);
      console.log(`[FileSystem] 📁 Creating virtual folder: ${folderPath}`);
      
      // Add to parent or root
      if (i === 0) {
        // Top-level folder (e.g., /src), add to root
        tree.push(folderNode);
      } else {
        // Nested folder (e.g., /src/components), add to parent
        const parentPath = '/' + parts.slice(0, i).join('/');
        const parent = pathMap.get(parentPath);
        if (parent && parent.children) {
          parent.children.push(folderNode);
        }
      }
    }
  };

  // Process each file
  for (const file of sortedFiles) {
    const node: FileNode = {
      id: file.$id,
      path: file.path,
      name: getFileName(file.path),
      type: file.type,
      content: file.content,
      language: file.language,
      size: file.size,
      children: file.type === 'folder' ? [] : undefined,
    };

    pathMap.set(file.path, node);

    // Ensure all parent folders exist (creates virtual folders if needed)
    ensureParentFolders(file.path);

    // Find parent directory
    const parentPath = getParentPath(file.path);
    
    if (parentPath === '/') {
      // Root level file/folder
      tree.push(node);
      console.log(`[FileSystem] 📄 Added root file: ${file.path}`);
    } else {
      // Add to parent folder
      const parent = pathMap.get(parentPath);
      if (parent && parent.children) {
        parent.children.push(node);
        console.log(`[FileSystem] 📄 Added file to ${parentPath}: ${file.name}`);
      } else {
        // This shouldn't happen if ensureParentFolders worked
        console.warn(`[FileSystem] ⚠️ Parent folder not found for: ${file.path}`);
        tree.push(node); // Fallback: add to root
      }
    }
  }

  const virtualFolders = pathMap.size - files.length;
  console.log(`[FileSystem] ✅ File tree built:`, {
    totalFiles: files.length,
    rootNodes: tree.length,
    virtualFolders,
    paths: Array.from(pathMap.keys())
  });

  // Sort nodes: folders first (alphabetically), then files (alphabetically)
  const sortNodesAlphabetically = (nodes: FileNode[]): FileNode[] => {
    return nodes.sort((a, b) => {
      // Folders come before files
      if (a.type === 'folder' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'folder') return 1;
      
      // Within same type, sort alphabetically (case-insensitive)
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    }).map(node => {
      // Recursively sort children
      if (node.children && node.children.length > 0) {
        node.children = sortNodesAlphabetically(node.children);
      }
      return node;
    });
  };

  const sortedTree = sortNodesAlphabetically(tree);

  return sortedTree;
}

// Get file name from path
export function getFileName(path: string): string {
  return path.split('/').filter(Boolean).pop() || '';
}

// Get parent directory path
export function getParentPath(path: string): string {
  const parts = path.split('/').filter(Boolean);
  if (parts.length <= 1) return '/';
  return '/' + parts.slice(0, -1).join('/');
}

// Create folder node
function createFolderNode(path: string): FileNode {
  return {
    id: `folder_${path.replace(/\//g, '_')}`,
    path,
    name: getFileName(path),
    type: 'folder',
    children: [],
  };
}

// Get language from file extension
export function getLanguageFromPath(path: string): SupportedLanguage {
  const ext = path.split('.').pop()?.toLowerCase();
  
  const languageMap: Record<string, SupportedLanguage> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'css',
    'sass': 'css',
    'less': 'css',
    'json': 'json',
    'md': 'markdown',
    'markdown': 'markdown',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'sql': 'sql',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'cpp',
    'cc': 'cpp',
    'cxx': 'cpp',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'swift': 'swift',
    'kt': 'kotlin',
    'kts': 'kotlin',
  };
  
  return languageMap[ext || ''] || 'typescript';
}

// Get file icon based on file type/extension
export function getFileIcon(path: string, type: 'file' | 'folder'): string {
  if (type === 'folder') {
    return '📁';
  }

  const ext = path.split('.').pop()?.toLowerCase();
  const fileName = getFileName(path).toLowerCase();

  // Special files
  if (fileName === 'package.json') return '📦';
  if (fileName === 'readme.md') return '📖';
  if (fileName === 'license') return '📄';
  if (fileName.startsWith('.env')) return '🔐';
  if (fileName === 'dockerfile') return '🐳';
  if (fileName.includes('config')) return '⚙️';

  // By extension
  const iconMap: Record<string, string> = {
    'ts': '🔷',
    'tsx': '⚛️',
    'js': '🟨',
    'jsx': '⚛️',
    'html': '🌐',
    'css': '🎨',
    'scss': '🎨',
    'json': '📋',
    'md': '📝',
    'py': '🐍',
    'java': '☕',
    'cpp': '⚡',
    'c': '⚡',
    'cs': '🔷',
    'php': '🐘',
    'rb': '💎',
    'go': '🐹',
    'rs': '🦀',
    'swift': '🦉',
    'kt': '🎯',
  };

  return iconMap[ext || ''] || '📄';
}

// Check if file is editable (text file)
export function isEditableFile(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase();
  
  const editableExtensions = [
    'ts', 'tsx', 'js', 'jsx', 'html', 'css', 'scss', 'sass', 'less',
    'json', 'md', 'markdown', 'xml', 'yaml', 'yml', 'txt', 'sql',
    'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt',
    'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd',
    'gitignore', 'dockerignore', 'editorconfig', 'prettierrc', 'eslintrc',
  ];

  return editableExtensions.includes(ext || '') || !ext;
}

// Get file size in human readable format
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Validate file path
export function isValidFilePath(path: string): boolean {
  // Must start with /
  if (!path.startsWith('/')) return false;
  
  // No empty segments
  if (path.includes('//')) return false;
  
  // No invalid characters
  const invalidChars = /[<>:"|?*\x00-\x1f]/;
  if (invalidChars.test(path)) return false;
  
  // No reserved names (Windows)
  const segments = path.split('/').filter(Boolean);
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  
  for (const segment of segments) {
    if (reservedNames.includes(segment.toUpperCase())) return false;
  }
  
  return true;
}

// Recursively find a file node by path
export function findFileNode(files: FileNode[], targetPath: string): FileNode | undefined {
  for (const file of files) {
    if (file.path === targetPath) {
      return file;
    }
    if (file.children) {
      const found = findFileNode(file.children, targetPath);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

// Flatten a file tree into an array of file nodes (folders and files)
export function flattenFileTree(files: FileNode[]): FileNode[] {
  const result: FileNode[] = [];

  const traverse = (nodes: FileNode[]) => {
    for (const node of nodes) {
      result.push(node);
      if (node.children) {
        traverse(node.children);
      }
    }
  };

  traverse(files);
  return result;
}
