import { useEffect } from "react";
import { realtimeService } from "@/lib/appwrite/realtimeService";
import { useFilesStore } from "@/lib/stores/filesStore";
import { useMessagesStore } from "@/lib/stores/messagesStore";
import { buildFileTree } from "@/lib/utils/fileSystem";

/**
 * Simple hook for realtime sync
 * Loads initial data and subscribes to updates
 */
export function useRealtimeSync(projectId: string | null) {
  const { setFiles, setFileTree, addFile, updateFile, deleteFile } =
    useFilesStore();
  const { setMessages, addMessage, updateMessage, deleteMessage } =
    useMessagesStore();

  useEffect(() => {
    if (!projectId) return;

    let isActive = true;

    // Load initial data
    const init = async () => {
      try {
        const [files, messages] = await Promise.all([
          realtimeService.getFiles(projectId),
          realtimeService.getMessages(projectId),
        ]);

        if (!isActive) return;

        setFiles(projectId, files);
        setFileTree(projectId, buildFileTree(files));
        setMessages(projectId, messages);
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    };

    init();

    // Rebuild file tree helper
    const rebuildFileTree = () => {
      const currentFiles =
        useFilesStore.getState().filesByProject[projectId] || [];
      setFileTree(projectId, buildFileTree(currentFiles));
    };

    // Subscribe to file changes
    const unsubFiles = realtimeService.subscribeToFiles(projectId, {
      onCreate: (file) => {
        console.log("[Realtime] ➕ File created:", file.path);
        addFile(projectId, file);
        // File tree rebuild is now handled automatically in addFile
      },
      onUpdate: (file) => {
        console.log("[Realtime] 🔄 File updated:", file.path);
        updateFile(projectId, file.$id, file);
        // File tree rebuild is now handled automatically in updateFile
      },
      onDelete: (fileId) => {
        console.log("[Realtime] ❌ File deleted:", fileId);
        deleteFile(projectId, fileId);
        rebuildFileTree(); // Still need manual rebuild for deletes
      },
    });

    // Subscribe to message changes
    const unsubMessages = realtimeService.subscribeToMessages(projectId, {
      onCreate: (message) => {
        console.log("[Realtime] ➕ Message created:", message.$id);
        addMessage(projectId, message);
      },
      onUpdate: (message) => {
        console.log("[Realtime] 🔄 Message updated:", message.$id);
        updateMessage(projectId, message.$id, message);
      },
      onDelete: (messageId) => {
        console.log("[Realtime] ❌ Message deleted:", messageId);
        deleteMessage(projectId, messageId);
      },
    });

    // Cleanup
    return () => {
      isActive = false;
      unsubFiles();
      unsubMessages();
    };
  }, [projectId]);
}
