import { FileNode, ProjectFile, SupportedLanguage } from '@/lib/types';

// Convert flat file list to tree structure
export function buildFileTree(files: ProjectFile[]): FileNode[] {
  const tree: FileNode[] = [];
  const pathMap = new Map<string, FileNode>();

  // Sort files by path to ensure proper tree building
  const sortedFiles = files.sort((a, b) => a.path.localeCompare(b.path));

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

    // Find parent directory
    const parentPath = getParentPath(file.path);
    
    if (parentPath === '/') {
      // Root level file/folder
      tree.push(node);
    } else {
      // Find or create parent folder
      const parent = pathMap.get(parentPath);
      if (parent && parent.type === 'folder') {
        parent.children = parent.children || [];
        parent.children.push(node);
      } else {
        // Parent doesn't exist, create it
        const parentNode = createFolderNode(parentPath);
        pathMap.set(parentPath, parentNode);
        parentNode.children = [node];
        
        // Add parent to tree or its parent
        const grandParentPath = getParentPath(parentPath);
        if (grandParentPath === '/') {
          tree.push(parentNode);
        }
      }
    }
  }

  return tree;
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
