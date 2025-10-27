"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/lib/stores/projectStore";
import { useProjectsStore } from "@/lib/stores/projectsStore";
import { useMessagesStore } from "@/lib/stores/messagesStore";
import { useFilesStore } from "@/lib/stores/filesStore";
import { useUIStore } from "@/lib/stores/uiStore";
import { useAuthStore } from "@/lib/stores/authStore";
import { useRealtimeSync } from "@/lib/hooks/useRealtimeSync";
import { syncLocalDBToUI, validateLocalDBSync } from "@/lib/utils/localDBSync";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { FileTree } from "@/components/editor/FileTree";
import { Preview, PreviewRef } from "@/components/preview/Preview";
import { Terminal } from "@/components/terminal/Terminal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/Dropdown";
import { DaytonaProvider } from "@/lib/contexts/DaytonaContext";
import { DaytonaInitializer } from "@/components/project/DaytonaInitializer";
import { FileChangeWatcher } from "@/components/project/FileChangeWatcher";
import { PreviewToolbar } from "@/components/preview/PreviewToolbar";

// Import debug utilities (available in browser console)
import "@/lib/utils/fileTreeDebug";

import { clientAuth } from "@/lib/appwrite/auth";
import {
  Code,
  Eye,
  Loader2,
  LogOut,
  LayoutDashboard,
  Edit3,
  Trash2,
  Boxes,
  ChevronDown,
} from "lucide-react";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const router = useRouter();
  const { currentProject, setCurrentProject, setFiles } = useProjectStore();
  const {
    projects,
    getProjectById,
    loadFromLocalDB: loadProjectsFromLocalDB,
    updateProject,
  } = useProjectsStore();
  const {
    loadFromLocalDB: loadMessagesFromLocalDB,
    syncWithAppwrite: syncMessages,
  } = useMessagesStore();
  const {
    fileTreeByProject,
    loadFromLocalDB: loadFilesFromLocalDB,
    syncWithAppwrite: syncFiles,
  } = useFilesStore();
  const {
    terminalCollapsed,
    rightPanelMode,
    previewMode,
    setPreviewMode,
    toggleRightPanelMode,
    terminalHeight,
  } = useUIStore();
  const { user, signOut } = useAuthStore();

  const [projectId, setProjectId] = useState<string>("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [projectNotFound, setProjectNotFound] = useState(false);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
  const previewRef = useRef<PreviewRef>(null);

  useEffect(() => {
    params.then((p) => setProjectId(p.projectId));
  }, [params]);

  // Setup realtime sync (includes project name updates)
  useRealtimeSync(projectId || null, user?.$id || null);

  // Define functions before they're used in useEffect dependencies
  const loadProject = useCallback(async () => {
    try {
      const authResult = await clientAuth.getCurrentUser();
      if (!authResult.success || !authResult.user) {
        router.push("/login");
        return;
      }

      // Get project from LocalDB (already checked in useEffect)
      const localProject = getProjectById(projectId);

      if (localProject) {
        console.log(
          "[ProjectPage] 🔄 Project in LocalDB, syncing with Appwrite..."
        );
        // Project exists in LocalDB, just sync with Appwrite in background
        await Promise.all([
          syncMessages(localProject.$id, authResult.user.$id),
          syncFiles(localProject.$id),
        ]);

        console.log("[ProjectPage] ✅ Sync complete");
        // Files will be updated automatically via useEffect watching fileTreeByProject

        setIsInitialLoad(false);
      } else {
        console.log("[ProjectPage] 📥 Fetching project from Appwrite...");
        // Not in LocalDB - need to fetch from Appwrite
        const { createClientSideClient } = await import(
          "@/lib/appwrite/config"
        );
        const { DATABASE_ID, COLLECTIONS } = await import(
          "@/lib/appwrite/config"
        );
        const { databases } = createClientSideClient();

        const projectData = await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.PROJECTS,
          projectId
        );

        // Verify project belongs to the current user
        if (projectData.userId !== authResult.user.$id) {
          setProjectNotFound(true);
          setIsInitialLoad(false);
          return;
        }

        console.log(
          "[ProjectPage] ✅ Project fetched from Appwrite:",
          projectData.title
        );
        setCurrentProject(projectData as unknown as typeof currentProject);

        // Load and sync messages and files from Appwrite
        console.log("[ProjectPage] 🔄 Syncing messages and files...");
        await Promise.all([
          syncMessages(projectData.$id, authResult.user.$id),
          syncFiles(projectData.$id),
        ]);

        console.log("[ProjectPage] ✅ All data loaded");
        // Realtime subscriptions handled by useRealtimeSync hook
        // Files will be updated automatically via useEffect watching fileTreeByProject

        setIsInitialLoad(false);
      }
    } catch (error) {
      console.error("Error loading project:", error);
      setProjectNotFound(true);
      setIsInitialLoad(false);
    }
  }, [
    projectId,
    router,
    getProjectById,
    syncMessages,
    syncFiles,
    setCurrentProject,
    setIsInitialLoad,
    setProjectNotFound,
  ]);

  const checkAuthAndLoadProject = useCallback(async () => {
    try {
      const authResult = await clientAuth.getCurrentUser();
      if (!authResult.success) {
        router.push("/login");
        return;
      }

      await loadProject();
    } catch (error) {
      console.error("Auth check failed:", error);
      router.push("/login");
    }
  }, [router, loadProject]);

  const checkAuthAndSyncInBackground = useCallback(
    async (projectIdToSync: string) => {
      try {
        const authResult = await clientAuth.getCurrentUser();
        if (!authResult.success || !authResult.user) {
          return;
        }

        // Sync with Appwrite in background without blocking UI
        console.log(
          "[ProjectPage] 🔄 Syncing messages and files with Appwrite..."
        );
        await Promise.all([
          syncMessages(projectIdToSync, authResult.user.$id),
          syncFiles(projectIdToSync),
        ]);

        console.log("[ProjectPage] ✅ Background sync completed");
        // Realtime subscriptions handled by useRealtimeSync hook
      } catch (error) {
        console.error("[ProjectPage] ❌ Background sync failed:", error);
      }
    },
    [syncMessages, syncFiles]
  );

  // Update files in projectStore when fileTreeByProject changes
  useEffect(() => {
    if (currentProject && fileTreeByProject[currentProject.$id]) {
      const projectFiles = fileTreeByProject[currentProject.$id];
      if (projectFiles.length > 0) {
        console.log(
          "[ProjectPage] 📁 Updating file tree:",
          projectFiles.length,
          "root nodes"
        );
        setFiles(projectFiles);

        // Validate that files have content
        const flattenTree = (nodes: typeof projectFiles): any[] => {
          const result: any[] = [];
          for (const node of nodes) {
            result.push(node);
            if (node.children) {
              result.push(...flattenTree(node.children));
            }
          }
          return result;
        };

        const allNodes = flattenTree(projectFiles);
        const fileNodes = allNodes.filter((n) => n.type === "file");
        const filesWithContent = fileNodes.filter(
          (n) => n.content && n.content.length > 0
        );
        console.log(
          `[ProjectPage] 📊 File tree stats: ${fileNodes.length} files, ${filesWithContent.length} with content`
        );

        if (filesWithContent.length < fileNodes.length) {
          console.warn(
            `[ProjectPage] ⚠️ ${
              fileNodes.length - filesWithContent.length
            } files missing content, triggering LocalDB sync`
          );
          // Force sync from LocalDB to ensure content is available
          syncLocalDBToUI(currentProject.$id);
        }
      }
    }
  }, [currentProject, fileTreeByProject, setFiles]);

  // First useEffect: Load projects from LocalDB on mount
  useEffect(() => {
    if (projects.length === 0 && !projectsLoaded) {
      console.log("[ProjectPage] 📂 Loading projects from LocalDB on mount...");
      loadProjectsFromLocalDB();
      setProjectsLoaded(true);
    }
  }, [projects.length, projectsLoaded, loadProjectsFromLocalDB]);

  // Second useEffect: Load project data once projectId and projects are ready
  useEffect(() => {
    if (!projectId) return;

    // Wait for projects to be loaded (either from state or just loaded)
    if (projects.length === 0 && !projectsLoaded) {
      console.log("[ProjectPage] ⏳ Waiting for projects to load...");
      return;
    }

    console.log("[ProjectPage] 🔍 Looking for project with ID:", projectId);

    // Reset project state when projectId changes to prevent showing old content
    console.log("[ProjectPage] 🧹 Cleaning up old project state");
    setCurrentProject(null);
    setFiles([]);
    setProjectNotFound(false);

    // Clear any cached files for previous project to prevent bleed-through
    // This ensures FileTree doesn't show old files while loading new project
    useProjectStore.getState().reset();

    // Now check if we have the project in LocalDB
    const localProject = getProjectById(projectId);

    if (localProject) {
      console.log(
        "[ProjectPage] 📂 Found project in LocalDB:",
        localProject.title
      );

      // Set project immediately
      setCurrentProject(localProject);

      // Load messages and files from LocalDB (instant)
      console.log(
        "[ProjectPage] 📂 Loading messages and files from LocalDB..."
      );
      loadMessagesFromLocalDB(localProject.$id);
      loadFilesFromLocalDB(localProject.$id);

      // Ensure LocalDB data is properly synced to UI stores
      setTimeout(() => {
        syncLocalDBToUI(localProject.$id);
        validateLocalDBSync(localProject.$id);
      }, 100); // Small delay to let LocalDB load complete

      // ALWAYS hide loader and show project page immediately
      // The data will appear once the stores update (via useEffect below)
      setIsInitialLoad(false);

      // ALWAYS sync with Appwrite in background (regardless of local data)
      console.log("[ProjectPage] 🔄 Starting background Appwrite sync...");
      checkAuthAndSyncInBackground(localProject.$id);
    } else {
      // Project not in LocalDB - need to fetch from Appwrite
      console.log(
        "[ProjectPage] ⚠️ Project not in LocalDB, fetching from Appwrite..."
      );
      setIsInitialLoad(true);
      checkAuthAndLoadProject();
    }
  }, [
    projectId,
    projects.length,
    projectsLoaded,
    checkAuthAndSyncInBackground,
    checkAuthAndLoadProject,
    getProjectById,
    loadFilesFromLocalDB,
    loadMessagesFromLocalDB,
    setCurrentProject,
    setFiles,
  ]);

  const handleUpdateProjectName = async () => {
    if (!currentProject || !editedName.trim()) return;

    try {
      const { createClientSideClient } = await import("@/lib/appwrite/config");
      const { DATABASE_ID, COLLECTIONS } = await import(
        "@/lib/appwrite/config"
      );
      const { databases } = createClientSideClient();

      const updatedProject = await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.PROJECTS,
        currentProject.$id,
        { title: editedName.trim() }
      );

      updateProject(currentProject.$id, updatedProject as any);
      setCurrentProject(updatedProject as any);
      setIsEditingName(false);
    } catch (error) {
      console.error("Error updating project name:", error);
      alert("Failed to update project name");
    }
  };

  const handleDeleteProject = async () => {
    if (!currentProject) return;
    if (
      !confirm(
        "Are you sure you want to delete this project? This action cannot be undone."
      )
    )
      return;

    try {
      const { createClientSideClient } = await import("@/lib/appwrite/config");
      const { DATABASE_ID, COLLECTIONS } = await import(
        "@/lib/appwrite/config"
      );
      const { Query } = await import("appwrite");
      const { databases } = createClientSideClient();

      const [filesResponse, messagesResponse] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTIONS.PROJECT_FILES, [
          Query.equal("projectId", currentProject.$id),
          Query.limit(1000),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.MESSAGES, [
          Query.equal("projectId", currentProject.$id),
          Query.limit(1000),
        ]),
      ]);

      const fileDeletePromises = filesResponse.documents.map((file) =>
        databases.deleteDocument(
          DATABASE_ID,
          COLLECTIONS.PROJECT_FILES,
          file.$id
        )
      );

      const messageDeletePromises = messagesResponse.documents.map((message) =>
        databases.deleteDocument(DATABASE_ID, COLLECTIONS.MESSAGES, message.$id)
      );

      const projectDeletePromise = databases.deleteDocument(
        DATABASE_ID,
        COLLECTIONS.PROJECTS,
        currentProject.$id
      );

      await Promise.all([
        ...fileDeletePromises,
        ...messageDeletePromises,
        projectDeletePromise,
      ]);

      router.push("/dashboard");
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Failed to delete project");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const handleRefreshPreview = () => {
    setPreviewKey((prev) => prev + 1);
  };

  const handleReloadIframe = () => {
    previewRef.current?.reloadIframe();
  };

  const handleExportProject = async () => {
    if (!currentProject) return;

    try {
      const response = await fetch(
        `/api/projects/${currentProject.$id}/export`
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${currentProject.slug}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error("Failed to export project");
      }
    } catch (error) {
      console.error("Error exporting project:", error);
    }
  };

  // Show loading only if we're doing initial load and have no project yet
  if (isInitialLoad && !currentProject) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  // Show "not found" only if we've finished loading and still don't have a project
  if (projectNotFound || (!isInitialLoad && !currentProject)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Project not found</h2>
          <p className="text-muted-foreground mb-4">
            The project you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button onClick={() => router.push("/dashboard")}>
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return null; // Safety fallback
  }

  return (
    <DaytonaProvider>
      <DaytonaInitializer projectId={currentProject.$id} />
      <FileChangeWatcher projectId={currentProject.$id} />
      <div className="h-screen flex flex-col bg-background">
        {/* Header / Navbar */}
        <header
          className={
            isFullscreenPreview
              ? "flex items-center justify-center px-4 py-3 border-b border-border bg-background/95 backdrop-blur relative z-50"
              : "grid grid-cols-3 gap-4 px-4 py-3 border-b border-border bg-background/95 backdrop-blur relative z-50"
          }
        >
          {isFullscreenPreview ? (
            /* Fullscreen Preview Mode - Centered Controls */
            <PreviewToolbar
              onReloadIframe={handleReloadIframe}
              onRefreshPreview={handleRefreshPreview}
              onExportProject={handleExportProject}
              previewMode={previewMode}
              onTogglePreviewMode={() =>
                setPreviewMode(previewMode === "desktop" ? "mobile" : "desktop")
              }
              onToggleFullscreen={() => setIsFullscreenPreview(false)}
              isFullscreen={true}
            />
          ) : (
            <>
              {/* Column 1 (1x): Logo, Project Name & Settings Dropdown */}
              <div className="flex items-center gap-3">
                <Boxes className="h-6 w-6 text-primary flex-shrink-0" />
                <div className="flex items-center gap-1 min-w-0">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdateProjectName();
                          if (e.key === "Escape") setIsEditingName(false);
                        }}
                        className="h-8 w-full"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={handleUpdateProjectName}
                        className="flex-shrink-0"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsEditingName(false)}
                        className="flex-shrink-0"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="font-semibold text-lg flex gap-1 items-center min-w-0">
                      <span className="truncate">{currentProject.title}</span>
                      <Dropdown
                        trigger={
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 flex-shrink-0"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        }
                      >
                        <DropdownItem
                          onClick={() => {
                            setEditedName(currentProject.title);
                            setIsEditingName(true);
                          }}
                        >
                          <Edit3 className="h-4 w-4" />
                          Update Name
                        </DropdownItem>
                        <DropdownSeparator />
                        <DropdownItem
                          onClick={handleDeleteProject}
                          variant="destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Project
                        </DropdownItem>
                      </Dropdown>
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2-3 (2x): Preview/Code Toggle, Controls & User Dropdown */}
              <div className="col-span-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Preview/Code Toggle */}
                  <div className="flex items-center border border-border rounded-xl">
                    <Button
                      size="sm"
                      variant={
                        rightPanelMode === "preview" ? "default" : "ghost"
                      }
                      onClick={() => toggleRightPanelMode()}
                      className="h-8 rounded-r-none border-r rounded-l-xl"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={rightPanelMode === "code" ? "default" : "ghost"}
                      onClick={() => toggleRightPanelMode()}
                      className="h-8 rounded-l-none rounded-r-xl"
                    >
                      <Code className="h-4 w-4 " />
                    </Button>
                  </div>

                  {/* Preview Controls (Only in Preview Mode) */}
                </div>

                {rightPanelMode === "preview" && (
                  <PreviewToolbar
                    onReloadIframe={handleReloadIframe}
                    onRefreshPreview={handleRefreshPreview}
                    onExportProject={handleExportProject}
                    previewMode={previewMode}
                    onTogglePreviewMode={() =>
                      setPreviewMode(
                        previewMode === "desktop" ? "mobile" : "desktop"
                      )
                    }
                    onToggleFullscreen={() => setIsFullscreenPreview(true)}
                    isFullscreen={false}
                  />
                )}

                {/* User Dropdown */}
                <Dropdown
                  align="right"
                  trigger={
                    <button className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold hover:opacity-90 transition-opacity">
                      {user?.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2) || "U"}
                    </button>
                  }
                >
                  <DropdownItem onClick={() => router.push("/dashboard")}>
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </DropdownItem>
                  <DropdownSeparator />
                  <DropdownItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </DropdownItem>
                </Dropdown>
              </div>
            </>
          )}
        </header>

        {/* Main Layout */}
        {isFullscreenPreview ? (
          /* Fullscreen Preview Mode */
          <div className="flex-1 overflow-hidden">
            <Preview key={previewKey} ref={previewRef} />
          </div>
        ) : (
          /* Normal 3 Column Grid (Chat: 1x, Preview/Code: 2x) */
          <div className="flex-1 flex overflow-hidden">
            {/* Chat Interface Column (1x width) */}
            <div className="flex-1 bg-background flex flex-col">
              <div className="flex-1 min-h-0">
                <ChatInterface
                  projectId={currentProject.$id}
                  className="h-full"
                />
              </div>
            </div>

            {/* Preview/Code Column (2x width) */}
            <div className="flex-[2] flex flex-col min-w-0">
              {rightPanelMode === "preview" ? (
                /* Preview Mode */
                <div className="flex-1 m-2 rounded-xl overflow-hidden border border-neutral-800">
                  <Preview key={previewKey} ref={previewRef} />
                </div>
              ) : (
                /* Code Mode */
                <div className="flex-1 flex flex-col m-2 rounded-xl overflow-hidden border border-neutral-800">
                  {/* File Tree + Editor */}
                  <div className="flex-1 flex overflow-hidden">
                    {/* File Tree */}
                    <div className="w-64 border-r border-border bg-background">
                      <FileTree />
                    </div>

                    {/* Code Editor */}
                    <div className="flex-1">
                      <CodeEditor />
                    </div>
                  </div>

                  {/* Terminal - Only in Code Mode */}
                  {!terminalCollapsed && (
                    <div
                      className="border-t border-border bg-background"
                      style={{ height: `${terminalHeight}px` }}
                    >
                      <Terminal />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DaytonaProvider>
  );
}
