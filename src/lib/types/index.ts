export * from './project';
export * from './message';
export * from './file';
export * from './user';

// Common utility types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  documents: T[];
  total: number;
}

export interface EditorState {
  selectedFile: string | null;
  openFiles: string[];
  unsavedChanges: Record<string, boolean>;
}

export interface UIState {
  sidebarCollapsed: boolean;
  terminalCollapsed: boolean;
  previewMode: 'desktop' | 'tablet' | 'mobile';
  theme: 'light' | 'dark';
}

export interface PreviewConfig {
  framework: 'react' | 'vue' | 'vanilla';
  entryPoint: string;
  dependencies: Record<string, string>;
}
