"use client";

import { useEffect, useRef } from "react";
import { useFilesStore } from "@/lib/stores/filesStore";
import { useDaytonaContext } from "@/lib/contexts/DaytonaContext";

interface FileChangeWatcherProps {
  projectId: string;
}

export function FileChangeWatcher({ projectId }: FileChangeWatcherProps) {
  const { filesByProject } = useFilesStore();
  const { restartDevServer, isReady } = useDaytonaContext();
  const packageJsonHashRef = useRef<string>("");
  const isRestartingRef = useRef(false);

  useEffect(() => {
    if (!isReady || isRestartingRef.current) return;

    const files = filesByProject[projectId] || [];

    // Find package.json
    const packageJson = files.find((f) => f.path === "/package.json");
    if (!packageJson || !packageJson.content) return;

    // Create hash of package.json content
    const currentHash = packageJson.content;

    // If hash changed and we have a previous hash, restart server
    if (packageJsonHashRef.current && packageJsonHashRef.current !== currentHash) {
      console.log("[FileWatcher] 📦 package.json changed, restarting server...");

      isRestartingRef.current = true;
      restartDevServer()
        .then(() => {
          console.log("[FileWatcher] ✅ Server restarted successfully");
          packageJsonHashRef.current = currentHash;
        })
        .catch((err) => {
          console.error("[FileWatcher] ❌ Failed to restart server:", err);
        })
        .finally(() => {
          isRestartingRef.current = false;
        });
    } else {
      // Store initial hash
      packageJsonHashRef.current = currentHash;
    }
  }, [filesByProject, projectId, isReady, restartDevServer]);

  return null;
}

