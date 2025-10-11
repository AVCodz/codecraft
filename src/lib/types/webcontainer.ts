/**
 * WEBCONTAINER TYPE DEFINITIONS - Types for WebContainer API integration
 * 
 * Purpose: Define WebContainer-specific types for file system and container state
 * Used by: WebContainer context, file system converter, preview functionality
 * Key Features: FileSystemTree structure, container state, file/directory types
 */

import { WebContainer } from '@webcontainer/api';

export interface WebContainerFile {
  file: {
    contents: string;
  };
}

export interface WebContainerDirectory {
  directory: {
    [key: string]: WebContainerFile | WebContainerDirectory;
  };
}

export type FileSystemTree = {
  [key: string]: WebContainerFile | WebContainerDirectory;
};

export interface WebContainerState {
  container: WebContainer | null;
  isBooting: boolean;
  isReady: boolean;
  serverUrl: string | null;
  error: string | null;
}

export { WebContainer };
