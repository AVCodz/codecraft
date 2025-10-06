export interface ProjectFile {
  $id: string;
  projectId: string;
  userId: string;
  path: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  language?: string;
  size?: number;
  createdAt: string;
  updatedAt: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface FileNode {
  id: string;
  path: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  language?: string;
  size?: number;
  children?: FileNode[];
  isOpen?: boolean;
  isSelected?: boolean;
}

export interface CreateFileData {
  projectId: string;
  userId: string;
  path: string;
  type: 'file' | 'folder';
  content?: string;
  language?: string;
  name?: string;
  size?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateFileData {
  content?: string;
  language?: string;
  size?: number;
  updatedAt?: string;
}

export type SupportedLanguage = 
  | 'typescript'
  | 'javascript'
  | 'html'
  | 'css'
  | 'json'
  | 'markdown'
  | 'xml'
  | 'yaml'
  | 'sql'
  | 'python'
  | 'java'
  | 'cpp'
  | 'csharp'
  | 'php'
  | 'ruby'
  | 'go'
  | 'rust'
  | 'swift'
  | 'kotlin';
