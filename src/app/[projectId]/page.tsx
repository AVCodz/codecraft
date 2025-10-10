"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/lib/stores/projectStore";
import { useProjectsStore } from "@/lib/stores/projectsStore";
import { useMessagesStore } from "@/lib/stores/messagesStore";
import { useFilesStore } from "@/lib/stores/filesStore";
import { useUIStore } from "@/lib/stores/uiStore";
import { useRealtimeSync } from "@/lib/hooks/useRealtimeSync";
import { syncLocalDBToUI, validateLocalDBSync } from "@/lib/utils/localDBSync";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { FileTree } from "@/components/editor/FileTree";
import { Preview } from "@/components/preview/Preview";
import { Terminal } from "@/components/terminal/Terminal";
import { Button } from "@/components/ui/Button";
import { WebContainerProvider } from "@/lib/contexts/WebContainerContext";
import { WebContainerInitializer } from "@/components/project/WebContainerInitializer";

// Import debug utilities (available in browser console)
import "@/lib/utils/fileTreeDebug";

import { clientAuth } from "@/lib/appwrite/auth";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Terminal as TerminalIcon,
  Download,
  Home,
  Code,
  Eye,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils/helpers";

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
    sidebarCollapsed,
    terminalCollapsed,
    rightPanelMode,
    toggleSidebar,
    toggleTerminal,
    toggleRightPanelMode,
    terminalHeight,
  } = useUIStore();

  const [projectId, setProjectId] = useState<string>("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [projectNotFound, setProjectNotFound] = useState(false);
  const [projectsLoaded, setProjectsLoaded] = useState(false);

  useEffect(() => {
    params.then((p) => setProjectId(p.projectId));
  }, [params]);

  // Setup realtime sync
  useRealtimeSync(projectId || null);

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
        const fileNodes = allNodes.filter(n => n.type === 'file');
        const filesWithContent = fileNodes.filter(n => n.content && n.content.length > 0);
        console.log(
          `[ProjectPage] 📊 File tree stats: ${fileNodes.length} files, ${filesWithContent.length} with content`
        );
        
        if (filesWithContent.length < fileNodes.length) {
          console.warn(
            `[ProjectPage] ⚠️ ${fileNodes.length - filesWithContent.length} files missing content, triggering LocalDB sync`
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
    setCurrentProject(null);
    setFiles([]);
    setProjectNotFound(false);

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
            <Home className="h-4 w-4 mr-2" />
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
    <WebContainerProvider>
      <WebContainerInitializer projectId={currentProject.$id} />
      <div className="h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="flex items-center justify-between p-3 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleSidebar}
              className="h-8 w-8"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>

            <div>
              <h1 className="font-semibold">{currentProject.title}</h1>
              <p className="text-xs text-muted-foreground capitalize">
                {currentProject.framework} project
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle between Preview and Code */}
            <div className="flex items-center border border-border rounded-md">
              <Button
                size="sm"
                variant={rightPanelMode === "preview" ? "default" : "ghost"}
                onClick={() => toggleRightPanelMode()}
                className="h-8 rounded-r-none border-r"
              >
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </Button>
              <Button
                size="sm"
                variant={rightPanelMode === "code" ? "default" : "ghost"}
                onClick={() => toggleRightPanelMode()}
                className="h-8 rounded-l-none"
              >
                <Code className="h-4 w-4 mr-1" />
                Code
              </Button>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={toggleTerminal}
              className="h-8"
            >
              <TerminalIcon className="h-4 w-4 mr-1" />
              Terminal
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleExportProject}
              className="h-8"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => router.push("/dashboard")}
              className="h-8"
            >
              <Home className="h-4 w-4 mr-1" />
              Dashboard
            </Button>
          </div>
        </header>

        {/* Main Layout - Two Column */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column - Chat Interface */}
          <div
            className={cn(
              "border-r border-border bg-background transition-all duration-300 flex flex-col",
              sidebarCollapsed ? "w-0" : "w-[600px]"
            )}
          >
            <div className="flex-1 min-h-0">
              <ChatInterface
                projectId={currentProject.$id}
                className="h-full"
              />
            </div>
          </div>

          {/* Right Column - Preview or Code */}
          <div className="flex-1 flex flex-col min-w-0">
            {rightPanelMode === "preview" ? (
              /* Preview Mode */
              <div className="flex-1">
                <Preview />
              </div>
            ) : (
              /* Code Mode */
              <div className="flex-1 flex flex-col overflow-hidden">
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
      </div>
    </WebContainerProvider>
  );
}
