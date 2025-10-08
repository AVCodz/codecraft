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
