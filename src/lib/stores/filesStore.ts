import { create } from "zustand";
import { ProjectFile, FileNode } from "@/lib/types";
import { localDB } from "@/lib/localdb";

type FileSyncStatus = "synced" | "syncing" | "error";

interface FileSyncMeta {
  status: FileSyncStatus;
  lastSyncedAt: Date | null;
  hasLocalChanges: boolean;
  errorMessage?: string;
}

interface FilesState {
  // State
  filesByProject: Record<string, ProjectFile[]>;
  fileTreeByProject: Record<string, FileNode[]>;
  syncMetadata: Map<string, FileSyncMeta>;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;

  // Actions
  setFiles: (projectId: string, files: ProjectFile[]) => void;
  setFileTree: (projectId: string, tree: FileNode[]) => void;
  addFile: (projectId: string, file: ProjectFile) => void;
  updateFile: (
    projectId: string,
    fileId: string,
    updates: Partial<ProjectFile>
  ) => void;
  deleteFile: (projectId: string, fileId: string) => void;
  setLoading: (loading: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setError: (error: string | null) => void;

  // Sync metadata actions
  setFileSyncStatus: (fileId: string, status: FileSyncStatus) => void;
  setFileLastSynced: (fileId: string, date: Date) => void;
  setFileSyncError: (fileId: string, error: string) => void;
  getFileSyncMeta: (fileId: string) => FileSyncMeta | undefined;

  // LocalDB + Appwrite sync methods
  loadFromLocalDB: (projectId: string) => void;
  syncWithAppwrite: (projectId: string) => Promise<void>;
  getFiles: (projectId: string) => ProjectFile[];
  getFileTree: (projectId: string) => FileNode[];
  clearProjectFiles: (projectId: string) => void;
  reset: () => void;
}

export const useFilesStore = create<FilesState>((set, get) => ({
  // Initial state
  filesByProject: {},
  fileTreeByProject: {},
  syncMetadata: new Map(),
  isLoading: false,
  isSyncing: false,
  error: null,

  // Sync metadata actions
  setFileSyncStatus: (fileId, status) => {
    const { syncMetadata } = get();
    const newMetadata = new Map(syncMetadata);
    const existing = newMetadata.get(fileId) || {
      status: "synced",
      lastSyncedAt: null,
      hasLocalChanges: false,
    };
    newMetadata.set(fileId, { ...existing, status });
    set({ syncMetadata: newMetadata });
  },

  setFileLastSynced: (fileId, date) => {
    const { syncMetadata } = get();
    const newMetadata = new Map(syncMetadata);
    const existing = newMetadata.get(fileId) || {
      status: "synced",
      lastSyncedAt: null,
      hasLocalChanges: false,
    };
    newMetadata.set(fileId, {
      ...existing,
      lastSyncedAt: date,
      hasLocalChanges: false,
    });
    set({ syncMetadata: newMetadata });
  },

  setFileSyncError: (fileId, error) => {
    const { syncMetadata } = get();
    const newMetadata = new Map(syncMetadata);
    const existing = newMetadata.get(fileId) || {
      status: "error",
      lastSyncedAt: null,
      hasLocalChanges: true,
    };
    newMetadata.set(fileId, {
      ...existing,
      status: "error",
      errorMessage: error,
    });
    set({ syncMetadata: newMetadata });
  },

  getFileSyncMeta: (fileId) => {
    return get().syncMetadata.get(fileId);
  },

  // Actions
  setFiles: (projectId, files) => {
    const { filesByProject } = get();
    set({
      filesByProject: {
        ...filesByProject,
        [projectId]: files,
      },
    });

    // Update LocalDB
    const allFiles = localDB.getAll<ProjectFile>("codeCraft_files");
    const otherFiles = allFiles.filter((f) => f.projectId !== projectId);
    localDB.setItems("codeCraft_files", [...otherFiles, ...files]);
  },

  setFileTree: (projectId, tree) => {
    const { fileTreeByProject } = get();
    set({
      fileTreeByProject: {
        ...fileTreeByProject,
        [projectId]: tree,
      },
    });
  },

  addFile: (projectId, file) => {
    const { filesByProject } = get();
    const projectFiles = filesByProject[projectId] || [];
    const updatedFiles = [...projectFiles, file];

    set({
      filesByProject: {
        ...filesByProject,
        [projectId]: updatedFiles,
      },
    });

    localDB.insert("codeCraft_files", file);
  },

  updateFile: (projectId, fileId, updates) => {
    const { filesByProject } = get();
    const projectFiles = filesByProject[projectId] || [];
    const updatedFiles = projectFiles.map((f) =>
      f.$id === fileId ? { ...f, ...updates } : f
    );

    set({
      filesByProject: {
        ...filesByProject,
        [projectId]: updatedFiles,
      },
    });

    // Mark as having local changes
    get().setFileSyncStatus(fileId, "syncing");

    localDB.update("codeCraft_files", fileId, updates);
  },

  deleteFile: (projectId, fileId) => {
    const { filesByProject } = get();
    const projectFiles = filesByProject[projectId] || [];
    const filteredFiles = projectFiles.filter((f) => f.$id !== fileId);

    set({
      filesByProject: {
        ...filesByProject,
        [projectId]: filteredFiles,
      },
    });

    localDB.delete("codeCraft_files", fileId);
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setError: (error) => set({ error }),

  // Load from LocalDB immediately (instant UI)
  loadFromLocalDB: (projectId: string) => {
    console.log(
      "[FilesStore] 📂 Loading files from LocalDB for project:",
      projectId
    );
    const allFiles = localDB.getAll<ProjectFile>("codeCraft_files");
    const projectFiles = allFiles.filter((f) => f.projectId === projectId);

    const { filesByProject } = get();
    set({
      filesByProject: {
        ...filesByProject,
        [projectId]: projectFiles,
      },
      isLoading: false,
    });
    console.log(
      "[FilesStore] ✅ Loaded",
      projectFiles.length,
      "files from LocalDB"
    );

    // Build file tree if files exist
    if (projectFiles.length > 0) {
      const buildFileTree = async () => {
        const { buildFileTree } = await import("@/lib/utils/fileSystem");
        const tree = buildFileTree(
          projectFiles as unknown as Parameters<typeof buildFileTree>[0]
        );
        const { fileTreeByProject } = get();
        set({
          fileTreeByProject: {
            ...fileTreeByProject,
            [projectId]: tree,
          },
        });
        console.log(
          "[FilesStore] 🌳 File tree built with",
          tree.length,
          "root nodes"
        );
      };
      buildFileTree();
    }
  },

  // Sync with Appwrite in background (initial load)
  syncWithAppwrite: async (projectId: string) => {
    console.log(
      "[FilesStore] 🔄 Starting Appwrite sync for project:",
      projectId
    );
    set({ isSyncing: true, error: null });

    try {
      const { createClientSideClient } = await import("@/lib/appwrite/config");
      const { DATABASE_ID, COLLECTIONS } = await import(
        "@/lib/appwrite/config"
      );
      const { Query } = await import("appwrite");
      const { buildFileTree } = await import("@/lib/utils/fileSystem");
      const { databases } = createClientSideClient();

      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PROJECT_FILES,
        [
          Query.equal("projectId", projectId),
          Query.limit(5000), // Get all files for the project
        ]
      );

      const files = response.documents as unknown as ProjectFile[];
      console.log(
        "[FilesStore] 📥 Received",
        files.length,
        "files from Appwrite"
      );

      const tree = buildFileTree(
        files as unknown as Parameters<typeof buildFileTree>[0]
      );
      console.log(
        "[FilesStore] 🌳 Built file tree with",
        tree.length,
        "root nodes"
      );

      // Update both state and LocalDB
      const { filesByProject, fileTreeByProject } = get();
      set({
        filesByProject: {
          ...filesByProject,
          [projectId]: files,
        },
        fileTreeByProject: {
          ...fileTreeByProject,
          [projectId]: tree,
        },
        isSyncing: false,
      });

      // Initialize sync metadata for all files
      files.forEach((file) => {
        get().setFileSyncStatus(file.$id, "synced");
        get().setFileLastSynced(file.$id, new Date());
      });

      // Update LocalDB - replace all files for this project
      const allFiles = localDB.getAll<ProjectFile>("codeCraft_files");
      const otherFiles = allFiles.filter((f) => f.projectId !== projectId);
      localDB.setItems("codeCraft_files", [...otherFiles, ...files]);

      console.log("[FilesStore] ✅ Sync complete - UI and LocalDB updated");
    } catch (error: unknown) {
      console.error("[FilesStore] ❌ Appwrite sync failed:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to sync files",
        isSyncing: false,
      });
    }
  },

  getFiles: (projectId: string) => {
    const { filesByProject } = get();
    return filesByProject[projectId] || [];
  },

  getFileTree: (projectId: string) => {
    const { fileTreeByProject } = get();
    return fileTreeByProject[projectId] || [];
  },

  clearProjectFiles: (projectId: string) => {
    const { filesByProject, fileTreeByProject } = get();
    const updatedFilesMap = { ...filesByProject };
    const updatedTreeMap = { ...fileTreeByProject };
    delete updatedFilesMap[projectId];
    delete updatedTreeMap[projectId];

    set({
      filesByProject: updatedFilesMap,
      fileTreeByProject: updatedTreeMap,
    });

    // Clear from LocalDB
    const allFiles = localDB.getAll<ProjectFile>("codeCraft_files");
    const otherFiles = allFiles.filter((f) => f.projectId !== projectId);
    localDB.setItems("codeCraft_files", otherFiles);
  },

  reset: () => {
    set({
      filesByProject: {},
      fileTreeByProject: {},
      syncMetadata: new Map(),
      isLoading: false,
      isSyncing: false,
      error: null,
    });
  },
}));
