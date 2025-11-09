/**
 * useRealtimeSync - React hook for real-time data synchronization
 * Manages WebSocket subscriptions for live project/file/message updates
 * Features: Auto-subscribe/unsubscribe, file tree rebuilding, message syncing
 * Used in: Project page for live collaboration and updates
 */
import { useEffect } from "react";
import { realtimeService } from "@/lib/appwrite/realtimeService";
import { useFilesStore } from "@/lib/stores/filesStore";
import { useMessagesStore } from "@/lib/stores/messagesStore";
import { useProjectsStore } from "@/lib/stores/projectsStore";
import { useProjectStore } from "@/lib/stores/projectStore";
import { buildFileTree } from "@/lib/utils/fileSystem";
export function useRealtimeSync(projectId: string | null, userId: string | null) {
  const { setFileTree, addFile, updateFile, deleteFile } =
    useFilesStore();
  const { addMessage, updateMessage, deleteMessage } =
    useMessagesStore();
  const { updateProject } = useProjectsStore();
  const { setCurrentProject } = useProjectStore();

  useEffect(() => {
    if (!projectId) return;

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

    // Subscribe to project changes (for project name updates, etc.)
    let unsubProjects: (() => void) | undefined;
    if (userId) {
      console.log(`[Realtime] 📡 Subscribing to project updates for userId: ${userId}, projectId: ${projectId}`);
      unsubProjects = realtimeService.subscribeToProjects(userId, {
        onUpdate: (project) => {
          console.log(`[Realtime] 📨 Received project update event:`, {
            receivedProjectId: project.$id,
            currentProjectId: projectId,
            title: project.title,
            matches: project.$id === projectId
          });
          
          // Only update if it's the current project
          if (project.$id === projectId) {
            console.log("[Realtime] 🔄 Project updated:", project.title);
            
            // Update in projects store (for dashboard list)
            updateProject(project.$id, project);
            
            // Always update current project (no need to check currentProject)
            // This ensures the navbar shows updated name immediately
            setCurrentProject(project);
            
            console.log("[Realtime] ✅ Project state updated successfully");
          } else {
            console.log("[Realtime] ⏭️ Skipping update - not the current project");
          }
        },
      });
      console.log("[Realtime] ✅ Project subscription active");
    } else {
      console.warn("[Realtime] ⚠️ No userId provided, skipping project subscription");
    }

    // Cleanup
    return () => {
      unsubFiles();
      unsubMessages();
      if (unsubProjects) {
        unsubProjects();
      }
    };
  }, [projectId, userId, updateProject, setCurrentProject, setFileTree, addFile, updateFile, deleteFile, addMessage, updateMessage, deleteMessage]);
}
