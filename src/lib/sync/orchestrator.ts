import { realtimeService } from '@/lib/appwrite/realtimeService';
import { COLLECTIONS } from '@/lib/appwrite/config';
import { useSyncStore } from '@/lib/stores/syncStore';
import { useFilesStore } from '@/lib/stores/filesStore';
import { ID } from 'appwrite';

interface PendingFileUpdate {
  fileId: string;
  content: string;
  projectId: string;
  timeout: NodeJS.Timeout;
}

class SyncOrchestrator {
  private pendingUpdates: Map<string, PendingFileUpdate> = new Map();
  private readonly DEBOUNCE_DELAY = 1500; // 1.5 seconds

  // Schedule debounced file content update
  scheduleFileContentUpdate(
    fileId: string,
    content: string,
    projectId: string
  ): void {
    // Clear existing timeout
    const existing = this.pendingUpdates.get(fileId);
    if (existing) {
      clearTimeout(existing.timeout);
    }

    console.log('[SyncOrchestrator] ⏱️ Scheduling update for file:', fileId);

    // Mark as syncing
    useFilesStore.getState().setFileSyncStatus(fileId, 'syncing');

    // Schedule new update
    const timeout = setTimeout(() => {
      this.executeFileUpdate(fileId, projectId);
    }, this.DEBOUNCE_DELAY);

    this.pendingUpdates.set(fileId, {
      fileId,
      content,
      projectId,
      timeout,
    });
  }

  // Execute queued file update
  private async executeFileUpdate(
    fileId: string,
    projectId: string
  ): Promise<void> {
    const pending = this.pendingUpdates.get(fileId);
    if (!pending) return;

    try {
      console.log('[SyncOrchestrator] 💾 Executing file update:', fileId);

      const clientId = useSyncStore.getState().clientId;
      const file = useFilesStore.getState().filesByProject[projectId]?.find(
        f => f.$id === fileId
      );

      if (!file) {
        throw new Error('File not found');
      }

      // Update in Appwrite
      await realtimeService.updateDocument(
        COLLECTIONS.PROJECT_FILES,
        fileId,
        {
          content: pending.content,
          size: Buffer.byteLength(pending.content, 'utf-8'),
          updatedAt: new Date().toISOString(),
        },
        clientId
      );

      // Mark as synced
      useFilesStore.getState().setFileSyncStatus(fileId, 'synced');
      useFilesStore.getState().setFileLastSynced(fileId, new Date());

      console.log('[SyncOrchestrator] ✅ File update complete:', fileId);
    } catch (error) {
      console.error('[SyncOrchestrator] ❌ File update failed:', error);
      useFilesStore.getState().setFileSyncStatus(fileId, 'error');
      useFilesStore.getState().setFileSyncError(fileId, (error as Error).message);
    } finally {
      this.pendingUpdates.delete(fileId);
    }
  }

  // Execute immediate file operation (create/delete/rename)
  async executeImmediateOperation(
    operation: 'create' | 'delete' | 'rename',
    data: any
  ): Promise<void> {
    const clientId = useSyncStore.getState().clientId;

    try {
      console.log('[SyncOrchestrator] ⚡ Executing immediate operation:', operation);

      switch (operation) {
        case 'create':
          await realtimeService.createDocument(
            COLLECTIONS.PROJECT_FILES,
            data.fileId || ID.unique(),
            {
              projectId: data.projectId,
              userId: data.userId,
              path: data.path,
              name: data.name,
              type: data.type,
              content: data.content || '',
              language: data.language,
              size: data.size || 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            clientId
          );
          break;

        case 'delete':
          await realtimeService.deleteDocument(
            COLLECTIONS.PROJECT_FILES,
            data.fileId
          );
          break;

        case 'rename':
          await realtimeService.updateDocument(
            COLLECTIONS.PROJECT_FILES,
            data.fileId,
            {
              name: data.newName,
              path: data.newPath,
              updatedAt: new Date().toISOString(),
            },
            clientId
          );
          break;
      }

      console.log('[SyncOrchestrator] ✅ Immediate operation complete:', operation);
    } catch (error) {
      console.error('[SyncOrchestrator] ❌ Immediate operation failed:', error);
      throw error;
    }
  }

  // Cancel pending update for a file
  cancelPendingUpdate(fileId: string): void {
    const pending = this.pendingUpdates.get(fileId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingUpdates.delete(fileId);
      console.log('[SyncOrchestrator] ⏸️ Cancelled pending update for file:', fileId);
    }
  }

  // Flush all pending updates immediately
  async flushAll(): Promise<void> {
    console.log('[SyncOrchestrator] 🚀 Flushing all pending updates');

    const promises = Array.from(this.pendingUpdates.values()).map(pending => {
      clearTimeout(pending.timeout);
      return this.executeFileUpdate(pending.fileId, pending.projectId);
    });

    await Promise.all(promises);
    this.pendingUpdates.clear();

    console.log('[SyncOrchestrator] ✅ All pending updates flushed');
  }

  // Get pending updates count
  getPendingCount(): number {
    return this.pendingUpdates.size;
  }

  // Check if file has pending update
  hasPendingUpdate(fileId: string): boolean {
    return this.pendingUpdates.has(fileId);
  }
}

export const syncOrchestrator = new SyncOrchestrator();

// Flush on browser close/refresh
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', async (e) => {
    const pendingCount = syncOrchestrator.getPendingCount();
    
    if (pendingCount > 0) {
      e.preventDefault();
      e.returnValue = '';
      
      // Try to flush synchronously
      await syncOrchestrator.flushAll();
    }
  });
}
