'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { WebContainer } from '@webcontainer/api';
import type { FileSystemTree } from '@/lib/types/webcontainer';

interface UseWebContainerOptions {
  autoboot?: boolean;
  onReady?: (container: WebContainer) => void;
  onServerReady?: (url: string, port: number) => void;
  onError?: (error: Error) => void;
}

export function useWebContainer(options: UseWebContainerOptions = {}) {
  const {
    autoboot = true,
    onReady,
    onServerReady,
    onError,
  } = options;

  const [container, setContainer] = useState<WebContainer | null>(null);
  const [isBooting, setIsBooting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const containerRef = useRef<WebContainer | null>(null);

  // Boot WebContainer
  const bootContainer = useCallback(async () => {
    if (containerRef.current) {
      console.log('[WebContainer] Already booted');
      return containerRef.current;
    }

    setIsBooting(true);
    setError(null);

    try {
      console.log('[WebContainer] Booting...');
      const instance = await WebContainer.boot();
      containerRef.current = instance;
      setContainer(instance);
      setIsReady(true);
      
      // Listen for server-ready event
      instance.on('server-ready', (port, url) => {
        console.log(`[WebContainer] Server ready at ${url} (port ${port})`);
        setServerUrl(url);
        onServerReady?.(url, port);
      });

      onReady?.(instance);
      console.log('[WebContainer] ✅ Booted successfully');
      return instance;
    } catch (err: any) {
      const errorMsg = `Failed to boot WebContainer: ${err.message}`;
      console.error('[WebContainer] ❌', errorMsg, err);
      setError(errorMsg);
      onError?.(err);
      return null;
    } finally {
      setIsBooting(false);
    }
  }, [onReady, onServerReady, onError]);

  // Mount files to WebContainer
  const mountFiles = useCallback(async (files: FileSystemTree) => {
    if (!containerRef.current) {
      throw new Error('WebContainer not ready. Call bootContainer first.');
    }

    try {
      console.log('[WebContainer] Mounting files...');
      await containerRef.current.mount(files);
      console.log('[WebContainer] ✅ Files mounted successfully');
    } catch (err: any) {
      const errorMsg = `Failed to mount files: ${err.message}`;
      console.error('[WebContainer] ❌', errorMsg, err);
      throw new Error(errorMsg);
    }
  }, []);

  // Run a command in WebContainer
  const runCommand = useCallback(async (
    command: string,
    args: string[] = [],
    options: { silent?: boolean } = {}
  ) => {
    if (!containerRef.current) {
      throw new Error('WebContainer not ready');
    }

    try {
      if (!options.silent) {
        console.log(`[WebContainer] Running: ${command} ${args.join(' ')}`);
      }
      
      const process = await containerRef.current.spawn(command, args);
      
      return {
        process,
        exit: await process.exit,
      };
    } catch (err: any) {
      const errorMsg = `Failed to run command: ${err.message}`;
      console.error('[WebContainer] ❌', errorMsg, err);
      throw new Error(errorMsg);
    }
  }, []);

  // Write file to WebContainer
  const writeFile = useCallback(async (path: string, content: string) => {
    if (!containerRef.current) {
      throw new Error('WebContainer not ready');
    }

    try {
      await containerRef.current.fs.writeFile(path, content);
      console.log(`[WebContainer] ✅ Wrote file: ${path}`);
    } catch (err: any) {
      console.error(`[WebContainer] ❌ Failed to write file ${path}:`, err);
      throw err;
    }
  }, []);

  // Read file from WebContainer
  const readFile = useCallback(async (path: string): Promise<string> => {
    if (!containerRef.current) {
      throw new Error('WebContainer not ready');
    }

    try {
      const content = await containerRef.current.fs.readFile(path, 'utf-8');
      return content;
    } catch (err: any) {
      console.error(`[WebContainer] ❌ Failed to read file ${path}:`, err);
      throw err;
    }
  }, []);

  // Remove file from WebContainer
  const removeFile = useCallback(async (path: string) => {
    if (!containerRef.current) {
      throw new Error('WebContainer not ready');
    }

    try {
      await containerRef.current.fs.rm(path, { force: true, recursive: false });
      console.log(`[WebContainer] ✅ Removed file: ${path}`);
    } catch (err: any) {
      console.error(`[WebContainer] ❌ Failed to remove file ${path}:`, err);
      throw err;
    }
  }, []);

  // Create directory in WebContainer
  const createDirectory = useCallback(async (path: string) => {
    if (!containerRef.current) {
      throw new Error('WebContainer not ready');
    }

    try {
      await containerRef.current.fs.mkdir(path, { recursive: true });
      console.log(`[WebContainer] ✅ Created directory: ${path}`);
    } catch (err: any) {
      console.error(`[WebContainer] ❌ Failed to create directory ${path}:`, err);
      throw err;
    }
  }, []);

  // Auto-boot on mount if enabled
  useEffect(() => {
    if (autoboot && !containerRef.current && !isBooting) {
      bootContainer();
    }
  }, [autoboot, bootContainer, isBooting]);

  return {
    container,
    isBooting,
    isReady,
    serverUrl,
    error,
    bootContainer,
    mountFiles,
    runCommand,
    writeFile,
    readFile,
    removeFile,
    createDirectory,
  };
}
