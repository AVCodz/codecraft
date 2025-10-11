/**
 * WebContainerInitializer - WebContainer setup and file synchronization
 * Initializes WebContainer instance and syncs project files from database
 * Features: Auto-boot WebContainer, file sync, dev server startup, real-time updates
 * Used in: Project page to run and preview code in browser-based Node.js environment
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { useWebContainerContext } from "@/lib/contexts/WebContainerContext";
import { useFilesStore } from "@/lib/stores/filesStore";
import { clientAuth } from "@/lib/appwrite/auth";

interface WebContainerInitializerProps {
  projectId: string;
}

export function WebContainerInitializer({
  projectId,
}: WebContainerInitializerProps) {
  const { initializeProject, isReady, writeFile, container } =
    useWebContainerContext();
  const { filesByProject } = useFilesStore();
  const initializedProjectRef = useRef<string | null>(null);
  const syncedFilesRef = useRef(new Set<string>());
  const [userId, setUserId] = useState<string | null>(null);

  // Get userId on mount
  useEffect(() => {
    const getUserId = async () => {
      const authResult = await clientAuth.getCurrentUser();
      if (authResult.success && authResult.user) {
        setUserId(authResult.user.$id);
      }
    };
    getUserId();
  }, []);

  // Initialize project once we have userId (and re-initialize if project changes)
  useEffect(() => {
    if (!projectId || !userId) return;

    // Check if this project is already initialized
    if (initializedProjectRef.current === projectId) {
      console.log(
        "[WebContainerInitializer] ✅ Project already initialized:",
        projectId
      );
      return;
    }

    console.log(
      "[WebContainerInitializer] 🔄 Initializing project:",
      projectId
    );
    if (initializedProjectRef.current) {
      console.log(
        "[WebContainerInitializer] 🔀 Switching from project:",
        initializedProjectRef.current
      );
      // Clear synced files cache when switching projects
      syncedFilesRef.current.clear();
    }

    initializedProjectRef.current = projectId;

    initializeProject(projectId, userId).catch((err) => {
      console.error("[WebContainerInitializer] ❌ Failed to initialize:", err);
      initializedProjectRef.current = null; // Allow retry
    });
  }, [projectId, userId, initializeProject]);

  // Sync files from database to WebContainer when they change
  useEffect(() => {
    if (!isReady || !container || !projectId) return;

    const projectFiles = filesByProject[projectId];
    if (!projectFiles || projectFiles.length === 0) return;

    const syncFiles = async () => {
      // Batch files that need syncing
      const filesToSync = projectFiles.filter((file) => {
        if (file.type !== "file" || !file.content) return false;
        const fileKey = `${file.path}:${file.updatedAt}`;
        return !syncedFilesRef.current.has(fileKey);
      });

      if (filesToSync.length === 0) return;

      console.log(
        `[WebContainerInitializer] Syncing ${filesToSync.length} files to WebContainer...`
      );

      // Process files in parallel batches of 5 to avoid overwhelming the system
      const batchSize = 5;
      for (let i = 0; i < filesToSync.length; i += batchSize) {
        const batch = filesToSync.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (file) => {
            const fileKey = `${file.path}:${file.updatedAt}`;
            try {
              await writeFile(file.path, file.content!);
              syncedFilesRef.current.add(fileKey);
            } catch (err) {
              console.error(
                "[WebContainerInitializer] Failed to sync file:",
                file.path,
                err
              );
            }
          })
        );
      }

      console.log(
        `[WebContainerInitializer] ✅ Synced ${filesToSync.length} files`
      );
    };

    syncFiles();
  }, [isReady, container, projectId, filesByProject, writeFile]);

  return null; // This component doesn't render anything
}
