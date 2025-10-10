"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { WebContainer } from "@webcontainer/api";
import type { FileSystemTree } from "@/lib/types/webcontainer";
import { REACT_TS_TAILWIND_TEMPLATE } from "@/lib/templates/react-ts-tailwind";
import { syncWebContainerToAppwrite } from "@/lib/utils/webContainerSync";

interface WebContainerContextValue {
  container: WebContainer | null;
  isBooting: boolean;
  isReady: boolean;
  serverUrl: string | null;
  error: string | null;
  bootContainer: () => Promise<WebContainer | null>;
  mountFiles: (files: FileSystemTree) => Promise<void>;
  runCommand: (
    command: string,
    args: string[]
  ) => Promise<{ process: unknown; exit: number }>;
  writeFile: (path: string, content: string) => Promise<void>;
  readFile: (path: string) => Promise<string>;
  removeFile: (path: string) => Promise<void>;
  createDirectory: (path: string) => Promise<void>;
  initializeProject: (projectId: string, userId: string) => Promise<void>;
}

const WebContainerContext = createContext<WebContainerContextValue | undefined>(
  undefined
);

// Global singleton to ensure only one WebContainer instance across the entire app
let globalWebContainerInstance: WebContainer | null = null;
let globalBootPromise: Promise<WebContainer | null> | null = null;

export function WebContainerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [container, setContainer] = useState<WebContainer | null>(
    globalWebContainerInstance
  );
  const [isBooting, setIsBooting] = useState(false);
  const [isReady, setIsReady] = useState(!!globalWebContainerInstance);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<WebContainer | null>(globalWebContainerInstance);
  const initPromiseRef = useRef<Promise<void> | null>(null);

  // Boot WebContainer (singleton pattern)
  const bootContainer = useCallback(async () => {
    // If we already have a global instance, use it
    if (globalWebContainerInstance) {
      console.log("[WebContainer] ⚡ Using existing global instance");
      containerRef.current = globalWebContainerInstance;
      setContainer(globalWebContainerInstance);
      setIsReady(true);
      return globalWebContainerInstance;
    }

    // If boot is already in progress, wait for it
    if (globalBootPromise) {
      console.log("[WebContainer] ⏳ Boot already in progress, waiting...");
      return await globalBootPromise;
    }

    setIsBooting(true);
    setError(null);

    // Create the boot promise and store it globally
    globalBootPromise = (async () => {
      try {
        console.log("[WebContainer] 🚀 Booting...");
        console.time("⏱️  Boot Container");

        const instance = await WebContainer.boot();

        console.timeEnd("⏱️  Boot Container");

        // Store globally
        globalWebContainerInstance = instance;
        containerRef.current = instance;
        setContainer(instance);
        setIsReady(true);

        // Listen for server-ready event
        instance.on("server-ready", (port, url) => {
          console.log(
            `[WebContainer] 🌐 Server ready at ${url} (port ${port})`
          );
          setServerUrl(url);
        });

        console.log("[WebContainer] ✅ Booted successfully");
        return instance;
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        const errorMsg = `Failed to boot WebContainer: ${error.message}`;
        console.error("[WebContainer] ❌", errorMsg, err);
        setError(errorMsg);
        return null;
      } finally {
        setIsBooting(false);
        globalBootPromise = null; // Clear the promise after completion
      }
    })();

    return await globalBootPromise;
  }, []);

  // Mount files to WebContainer
  const mountFiles = useCallback(async (files: FileSystemTree) => {
    if (!containerRef.current) {
      throw new Error("WebContainer not ready. Call bootContainer first.");
    }

    try {
      console.log("[WebContainer] 📁 Mounting files...");
      console.time("⏱️  Mount Files");

      await containerRef.current.mount(files);

      console.timeEnd("⏱️  Mount Files");
      console.log("[WebContainer] ✅ Files mounted successfully");
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      const errorMsg = `Failed to mount files: ${error.message}`;
      console.error("[WebContainer] ❌", errorMsg, err);
      throw new Error(errorMsg);
    }
  }, []);

  // Run a command in WebContainer
  const runCommand = useCallback(
    async (command: string, args: string[] = []) => {
      if (!containerRef.current) {
        throw new Error("WebContainer not ready");
      }

      try {
        console.log(`[WebContainer] Running: ${command} ${args.join(" ")}`);
        const process = await containerRef.current.spawn(command, args);
        const exit = await process.exit;

        return { process, exit };
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        const errorMsg = `Failed to run command: ${error.message}`;
        console.error("[WebContainer] ❌", errorMsg, err);
        throw new Error(errorMsg);
      }
    },
    []
  );

  // Write file to WebContainer
  const writeFile = useCallback(async (path: string, content: string) => {
    if (!containerRef.current) {
      throw new Error("WebContainer not ready");
    }

    try {
      // Create parent directories if needed
      const dirPath = path.substring(0, path.lastIndexOf("/"));
      if (dirPath && dirPath !== "/") {
        await containerRef.current.fs.mkdir(dirPath, { recursive: true });
      }
      await containerRef.current.fs.writeFile(path, content);
      console.log(`[WebContainer] ✅ Wrote file: ${path}`);
    } catch (err: unknown) {
      console.error(`[WebContainer] ❌ Failed to write file ${path}:`, err);
      throw err;
    }
  }, []);

  // Read file from WebContainer
  const readFile = useCallback(async (path: string): Promise<string> => {
    if (!containerRef.current) {
      throw new Error("WebContainer not ready");
    }

    try {
      const content = await containerRef.current.fs.readFile(path, "utf-8");
      return content;
    } catch (err: unknown) {
      console.error(`[WebContainer] ❌ Failed to read file ${path}:`, err);
      throw err;
    }
  }, []);

  // Remove file from WebContainer
  const removeFile = useCallback(async (path: string) => {
    if (!containerRef.current) {
      throw new Error("WebContainer not ready");
    }

    try {
      await containerRef.current.fs.rm(path, { force: true, recursive: false });
      console.log(`[WebContainer] ✅ Removed file: ${path}`);
    } catch (err: unknown) {
      console.error(`[WebContainer] ❌ Failed to remove file ${path}:`, err);
      throw err;
    }
  }, []);

  // Create directory in WebContainer
  const createDirectory = useCallback(async (path: string) => {
    if (!containerRef.current) {
      throw new Error("WebContainer not ready");
    }

    try {
      await containerRef.current.fs.mkdir(path, { recursive: true });
      console.log(`[WebContainer] ✅ Created directory: ${path}`);
    } catch (err: unknown) {
      console.error(
        `[WebContainer] ❌ Failed to create directory ${path}:`,
        err
      );
      throw err;
    }
  }, []);

  // Initialize project with template or existing files
  const initializeProject = useCallback(
    async (projectId: string, userId: string) => {
      // Prevent multiple simultaneous initializations
      if (initPromiseRef.current) {
        console.log("[WebContainer] Initialization already in progress");
        await initPromiseRef.current;
        return;
      }

      const initPromise = (async () => {
        try {
          // Boot container if not already booted
          if (!containerRef.current) {
            await bootContainer();
          }

          if (!containerRef.current) {
            throw new Error("Failed to boot WebContainer");
          }

          console.log("[WebContainer] 🔧 Initializing React project...");
          console.time("⏱️  Total Initialization");

          // Step 1: Check if project already has files in Appwrite
          console.time("⏱️  Fetch Files from Appwrite");
          const { createClientSideClient } = await import(
            "@/lib/appwrite/config"
          );
          const { DATABASE_ID, COLLECTIONS } = await import(
            "@/lib/appwrite/config"
          );
          const { Query } = await import("appwrite");
          const { databases } = createClientSideClient();

          const existingFilesResponse = await databases.listDocuments({
            databaseId: DATABASE_ID,
            collectionId: COLLECTIONS.PROJECT_FILES,
            queries: [Query.equal("projectId", projectId), Query.limit(10)],
          });
          console.timeEnd("⏱️  Fetch Files from Appwrite");

          const hasExistingFiles = existingFilesResponse.documents.length > 0;

          if (hasExistingFiles) {
            console.log(
              "[WebContainer] 📂 Project has existing files, loading from Appwrite..."
            );

            // Load all existing files
            console.time("⏱️  Load All Files");
            const allFilesResponse = await databases.listDocuments({
              databaseId: DATABASE_ID,
              collectionId: COLLECTIONS.PROJECT_FILES,
              queries: [Query.equal("projectId", projectId), Query.limit(1000)],
            });
            console.timeEnd("⏱️  Load All Files");

            // Build file system tree from existing files
            const { convertAppwriteFilesToFileSystemTree } = await import(
              "@/lib/utils/fileSystemConverter"
            );
            const fileSystemTree = convertAppwriteFilesToFileSystemTree(
              allFilesResponse.documents.map((doc) => ({
                path: doc.path,
                content: doc.content,
              }))
            );

            // Mount existing files
            await mountFiles(fileSystemTree);
            console.log(
              "[WebContainer] ✅ Loaded",
              allFilesResponse.documents.length,
              "existing files"
            );
          } else {
            console.log("[WebContainer] 🆕 New project, using template...");

            // Use template for new projects
            await mountFiles(REACT_TS_TAILWIND_TEMPLATE);

            // Sync template files to Appwrite (only for new projects)
            console.log("[WebContainer] 🔄 Syncing template to Appwrite...");
            console.time("⏱️  Sync Template");
            const syncResult = await syncWebContainerToAppwrite(
              containerRef.current,
              projectId,
              userId
            );
            console.timeEnd("⏱️  Sync Template");

            console.log(
              `[WebContainer] ✅ Template synced: ${syncResult.success}/${syncResult.total} files`
            );

            if (syncResult.failed > 0) {
              console.warn(
                `[WebContainer] ⚠️ ${syncResult.failed} files failed to sync`
              );
            }
          }

          // Install dependencies
          console.log("[WebContainer] 📦 Installing dependencies...");
          console.time("⏱️  npm install");
          const installProcess = await containerRef.current.spawn("npm", [
            "install",
          ]);
          const installExit = await installProcess.exit;
          console.timeEnd("⏱️  npm install");

          if (installExit !== 0) {
            console.error("[WebContainer] ⚠️ npm install failed");
          } else {
            console.log("[WebContainer] ✅ Dependencies installed");
          }

          // Start dev server
          console.log("[WebContainer] 🚀 Starting dev server...");
          console.time("⏱️  Start Dev Server");
          const devProcess = await containerRef.current.spawn("npm", [
            "run",
            "dev",
          ]);

          // Don't await the dev server (it runs indefinitely)
          // WebContainer output is ReadableStream<string>, not bytes
          devProcess.output.pipeTo(
            new WritableStream({
              write(data: string) {
                // data is already a string (ReadableStream<string>)
                if (data) {
                  console.log("[DevServer]", data.trim());

                  // Check if server is ready (Vite shows this)
                  if (data.includes("Local:") || data.includes("ready in")) {
                    console.timeEnd("⏱️  Start Dev Server");
                  }
                }
              },
            })
          );

          console.timeEnd("⏱️  Total Initialization");
          console.log("[WebContainer] ✅ Project initialized successfully");
        } catch (err: unknown) {
          console.error("[WebContainer] ❌ Failed to initialize project:", err);
          const error = err instanceof Error ? err : new Error("Unknown error");
          setError(error.message);
          throw err;
        } finally {
          initPromiseRef.current = null;
        }
      })();

      initPromiseRef.current = initPromise;
      await initPromise;
    },
    [bootContainer, mountFiles]
  );

  // Auto-boot on mount (only if not already booted globally)
  useEffect(() => {
    if (!globalWebContainerInstance && !globalBootPromise && !isBooting) {
      bootContainer();
    }
  }, [bootContainer, isBooting]);

  const value: WebContainerContextValue = {
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
    initializeProject,
  };

  return (
    <WebContainerContext.Provider value={value}>
      {children}
    </WebContainerContext.Provider>
  );
}

export function useWebContainerContext() {
  const context = useContext(WebContainerContext);
  if (context === undefined) {
    throw new Error(
      "useWebContainerContext must be used within a WebContainerProvider"
    );
  }
  return context;
}
