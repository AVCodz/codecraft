import { create } from "zustand";
import { Project, FileNode } from "@/lib/types";
import { findFileNode } from "@/lib/utils/fileSystem";
import { useFilesStore } from "@/lib/stores/filesStore";

interface ProjectStore {
  // Current project state
  currentProject: Project | null;
  files: FileNode[];
  selectedFile: string | null;
  openFiles: string[];
  unsavedChanges: Record<string, boolean>;

  // Loading states
  isLoading: boolean;
  isSaving: boolean;

  // Actions
  setCurrentProject: (project: Project | null) => void;
  setFiles: (files: FileNode[]) => void;
  refreshFiles: (projectId: string) => Promise<void>;
  selectFile: (path: string) => void;
  openFile: (path: string) => void;
  closeFile: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  markFileAsUnsaved: (path: string) => void;
  markFileAsSaved: (path: string) => void;
  createFile: (path: string, type: "file" | "folder", content?: string) => void;
  deleteFile: (path: string) => void;
  renameFile: (oldPath: string, newPath: string) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  reset: () => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  // Initial state
  currentProject: null,
  files: [],
  selectedFile: null,
  openFiles: [],
  unsavedChanges: {},
  isLoading: false,
  isSaving: false,

  // Actions
  setCurrentProject: (project) => set({ currentProject: project }),

  setFiles: (files) => set({ files }),

  refreshFiles: async (projectId: string) => {
    try {
      // Use filesStore for syncing
      const { useFilesStore } = await import("@/lib/stores/filesStore");
      const filesStore = useFilesStore.getState();

      // Sync with Appwrite
      await filesStore.syncWithAppwrite(projectId);

      // Get updated file tree
      const tree = filesStore.getFileTree(projectId);
      set({ files: tree });
    } catch (error) {
      console.error("Failed to refresh files:", error);
    }
  },

  selectFile: (path) => {
    const { openFiles, files, currentProject } = get();

    // Validate file exists in the tree
    const fileExists = findFileNode(files, path);
    if (!fileExists) {
      console.warn(
        `[ProjectStore] ⚠️ Cannot select file - not found in tree: ${path}`
      );
      // Still set the selection - CodeEditor will handle the fallback
    }

    console.log(`[ProjectStore] 📄 Selecting file: ${path}`);
    
    // Set selection immediately (synchronously) to avoid race conditions
    set({
      selectedFile: path,
      openFiles: openFiles.includes(path) ? openFiles : [...openFiles, path],
    });

    // Log file content status for debugging
    if (fileExists) {
      if (fileExists.content) {
        console.log(
          `[ProjectStore] ✅ File has content: ${path} (${fileExists.content.length} chars)`
        );
      } else {
        console.warn(`[ProjectStore] ⚠️ File has no content in tree: ${path}`);
        
        // Try to get content from filesStore as fallback (synchronously)
        if (currentProject) {
          const filesStore = useFilesStore.getState();
          const rawFiles = filesStore.filesByProject[currentProject.$id] || [];
          const rawFile = rawFiles.find((f) => f.path === path);
          
          if (rawFile && rawFile.content) {
            console.log(
              `[ProjectStore] 🔄 Found content in filesStore, updating file tree node: ${path}`
            );
            // Update the file node with content synchronously
            const updatedFiles = updateFileInTree(files, path, rawFile.content);
            set({ files: updatedFiles });
          } else {
            console.warn(
              `[ProjectStore] ⚠️ File has no content in filesStore either: ${path}`
            );
          }
        }
      }
    }
  },

  openFile: (path) => {
    const { openFiles } = get();
    if (!openFiles.includes(path)) {
      set({
        openFiles: [...openFiles, path],
        selectedFile: path,
      });
    } else {
      set({ selectedFile: path });
    }
  },

  closeFile: (path) => {
    const { openFiles, selectedFile } = get();
    const newOpenFiles = openFiles.filter((f) => f !== path);
    const newSelectedFile =
      selectedFile === path
        ? newOpenFiles.length > 0
          ? newOpenFiles[newOpenFiles.length - 1]
          : null
        : selectedFile;

    set({
      openFiles: newOpenFiles,
      selectedFile: newSelectedFile,
    });
  },

  updateFileContent: (path, content) => {
    const { files } = get();
    const updatedFiles = updateFileInTree(files, path, content);
    set({
      files: updatedFiles,
      unsavedChanges: { ...get().unsavedChanges, [path]: true },
    });
  },

  markFileAsUnsaved: (path) => {
    set({
      unsavedChanges: { ...get().unsavedChanges, [path]: true },
    });
  },

  markFileAsSaved: (path) => {
    const { unsavedChanges } = get();
    const newUnsavedChanges = { ...unsavedChanges };
    delete newUnsavedChanges[path];
    set({ unsavedChanges: newUnsavedChanges });
  },

  createFile: (path, type, content = "") => {
    const { files } = get();
    const newFile: FileNode = {
      id: generateId(),
      path,
      name: getFileName(path),
      type,
      content: type === "file" ? content : undefined,
      language: type === "file" ? getLanguageFromPath(path) : undefined,
      children: type === "folder" ? [] : undefined,
    };

    const updatedFiles = addFileToTree(files, newFile);
    set({ files: updatedFiles });
  },

  deleteFile: (path) => {
    const { files, openFiles, selectedFile } = get();
    const updatedFiles = removeFileFromTree(files, path);
    const newOpenFiles = openFiles.filter((f) => !f.startsWith(path));
    const newSelectedFile = selectedFile?.startsWith(path)
      ? null
      : selectedFile;

    set({
      files: updatedFiles,
      openFiles: newOpenFiles,
      selectedFile: newSelectedFile,
    });
  },

  renameFile: (oldPath, newPath) => {
    const { files, openFiles, selectedFile } = get();
    const updatedFiles = renameFileInTree(files, oldPath, newPath);
    const newOpenFiles = openFiles.map((f) =>
      f.startsWith(oldPath) ? f.replace(oldPath, newPath) : f
    );
    const newSelectedFile = selectedFile?.startsWith(oldPath)
      ? selectedFile.replace(oldPath, newPath)
      : selectedFile;

    set({
      files: updatedFiles,
      openFiles: newOpenFiles,
      selectedFile: newSelectedFile,
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setSaving: (saving) => set({ isSaving: saving }),

  reset: () =>
    set({
      currentProject: null,
      files: [],
      selectedFile: null,
      openFiles: [],
      unsavedChanges: {},
      isLoading: false,
      isSaving: false,
    }),
}));

// Helper functions
function updateFileInTree(
  files: FileNode[],
  path: string,
  content: string
): FileNode[] {
  return files.map((file) => {
    if (file.path === path) {
      return { ...file, content };
    }
    if (file.children) {
      return {
        ...file,
        children: updateFileInTree(file.children, path, content),
      };
    }
    return file;
  });
}

function addFileToTree(files: FileNode[], newFile: FileNode): FileNode[] {
  const pathParts = newFile.path.split("/").filter(Boolean);

  if (pathParts.length === 1) {
    return [...files, newFile];
  }

  const parentPath = "/" + pathParts.slice(0, -1).join("/");

  return files.map((file) => {
    if (file.path === parentPath && file.type === "folder") {
      return {
        ...file,
        children: [...(file.children || []), newFile],
      };
    }
    if (file.children) {
      return { ...file, children: addFileToTree(file.children, newFile) };
    }
    return file;
  });
}

function removeFileFromTree(files: FileNode[], path: string): FileNode[] {
  return files
    .filter((file) => file.path !== path)
    .map((file) => {
      if (file.children) {
        return { ...file, children: removeFileFromTree(file.children, path) };
      }
      return file;
    });
}

function renameFileInTree(
  files: FileNode[],
  oldPath: string,
  newPath: string
): FileNode[] {
  return files.map((file) => {
    if (file.path === oldPath) {
      return {
        ...file,
        path: newPath,
        name: getFileName(newPath),
      };
    }
    if (file.children) {
      return {
        ...file,
        children: renameFileInTree(file.children, oldPath, newPath),
      };
    }
    return file;
  });
}

function getFileName(path: string): string {
  return path.split("/").pop() || "";
}

function getLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown",
    py: "python",
    java: "java",
    cpp: "cpp",
    c: "cpp",
    cs: "csharp",
    php: "php",
    rb: "ruby",
    go: "go",
    rs: "rust",
    swift: "swift",
    kt: "kotlin",
  };

  return languageMap[ext || ""] || "plaintext";
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}
