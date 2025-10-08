'use client';

import { useEffect, useRef, useState } from 'react';
import { useWebContainerContext } from '@/lib/contexts/WebContainerContext';
import { useFilesStore } from '@/lib/stores/filesStore';
import { clientAuth } from '@/lib/appwrite/auth';

interface WebContainerInitializerProps {
  projectId: string;
}

export function WebContainerInitializer({ projectId }: WebContainerInitializerProps) {
  const { initializeProject, isReady, writeFile, container } = useWebContainerContext();
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
      console.log('[WebContainerInitializer] ✅ Project already initialized:', projectId);
      return;
    }

    console.log('[WebContainerInitializer] 🔄 Initializing project:', projectId);
    if (initializedProjectRef.current) {
      console.log('[WebContainerInitializer] 🔀 Switching from project:', initializedProjectRef.current);
      // Clear synced files cache when switching projects
      syncedFilesRef.current.clear();
    }
    
    initializedProjectRef.current = projectId;
    
    initializeProject(projectId, userId).catch((err) => {
      console.error('[WebContainerInitializer] ❌ Failed to initialize:', err);
      initializedProjectRef.current = null; // Allow retry
    });
  }, [projectId, userId, initializeProject]);

  // Sync files from database to WebContainer when they change
  useEffect(() => {
    if (!isReady || !container || !projectId) return;

    const projectFiles = filesByProject[projectId];
    if (!projectFiles || projectFiles.length === 0) return;

    const syncFiles = async () => {
      for (const file of projectFiles) {
        if (file.type !== 'file' || !file.content) continue;
        
        const fileKey = `${file.path}:${file.updatedAt}`;
        if (syncedFilesRef.current.has(fileKey)) continue;

        try {
          console.log('[WebContainerInitializer] Syncing file to WebContainer:', file.path);
          await writeFile(file.path, file.content);
          syncedFilesRef.current.add(fileKey);
        } catch (err) {
          console.error('[WebContainerInitializer] Failed to sync file:', file.path, err);
        }
      }
    };

    syncFiles();
  }, [isReady, container, projectId, filesByProject, writeFile]);

  return null; // This component doesn't render anything
}
