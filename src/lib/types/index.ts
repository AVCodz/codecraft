/**
 * TYPE DEFINITIONS INDEX - Central export point for all TypeScript types
 * 
 * Purpose: Re-exports all type definitions and provides common utility types
 * Used by: All components, pages, and utilities throughout the application
 * Key Features: ApiResponse, PaginatedResponse, EditorState, UIState, PreviewConfig
 */

export * from './project';
export * from './message';
export * from './file';
export * from './user';
export * from './streaming';

// Common utility types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = unknown> {
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
