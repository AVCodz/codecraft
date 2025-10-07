"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/lib/stores/projectStore";
import { useProjectsStore } from "@/lib/stores/projectsStore";
import { useMessagesStore } from "@/lib/stores/messagesStore";
import { useFilesStore } from "@/lib/stores/filesStore";
import { useUIStore } from "@/lib/stores/uiStore";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { FileTree } from "@/components/editor/FileTree";
import { Preview } from "@/components/preview/Preview";
import { Terminal } from "@/components/terminal/Terminal";
import { Button } from "@/components/ui/Button";

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
  params: Promise<{ slug: string }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const router = useRouter();
  const { currentProject, setCurrentProject, setFiles } = useProjectStore();
  const { getProjectBySlug } = useProjectsStore();
  const {
    loadFromLocalDB: loadMessagesFromLocalDB,
    syncWithAppwrite: syncMessages,
    getMessages,
  } = useMessagesStore();
  const {
    loadFromLocalDB: loadFilesFromLocalDB,
    syncWithAppwrite: syncFiles,
    getFileTree,
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

  const [slug, setSlug] = useState<string>("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [projectNotFound, setProjectNotFound] = useState(false);

  useEffect(() => {
    params.then((p) => setSlug(p.slug));
  }, [params]);

  useEffect(() => {
    if (!slug) return;

    // Use a flag to prevent double execution
    let didLoad = false;

    const loadProjectData = () => {
      if (didLoad) return;
      didLoad = true;

      // Reset project state when slug changes to prevent showing old content
      setCurrentProject(null);
      setFiles([]);
      setProjectNotFound(false);

      // Check if we have data in LocalDB for this project
      const localProject = getProjectBySlug(slug);
      if (localProject) {
        // We have the project in LocalDB, set it immediately
        setCurrentProject(localProject);

        // Load messages and files from LocalDB
        loadMessagesFromLocalDB(localProject.$id);
        loadFilesFromLocalDB(localProject.$id);

        const localMessages = getMessages(localProject.$id);
        const localFiles = getFileTree(localProject.$id);

        // Set files immediately if we have them
        if (localFiles.length > 0) {
          setFiles(localFiles);
        }

        // If we have messages OR files, don't show loader
        if (localMessages.length > 0 || localFiles.length > 0) {
          setIsInitialLoad(false);

          // Sync with Appwrite in background without blocking UI
          checkAuthAndSyncInBackground(localProject.$id);
        } else {
          // No data in LocalDB, will need to show loader
          setIsInitialLoad(true);
          checkAuthAndLoadProject();
        }
      } else {
        // Project not in LocalDB, will show loader
        setIsInitialLoad(true);
        checkAuthAndLoadProject();
      }
    };

    loadProjectData();

    return () => {
      // Cleanup flag
      didLoad = false;
    };
  }, [slug]);

  const checkAuthAndLoadProject = async () => {
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
  };

  const checkAuthAndSyncInBackground = async (projectId: string) => {
    try {
      const authResult = await clientAuth.getCurrentUser();
      if (!authResult.success || !authResult.user) {
        return;
      }

      // Sync with Appwrite in background without blocking UI
      Promise.all([
        syncMessages(projectId, authResult.user.$id),
        syncFiles(projectId),
      ])
        .then(() => {
          // Update files in projectStore after sync
          const updatedFiles = getFileTree(projectId);
          if (updatedFiles.length > 0) {
            setFiles(updatedFiles);
          }
        })
        .catch((err) => {
          console.error("Background sync failed:", err);
        });
    } catch (error) {
      console.error("Background sync auth failed:", error);
    }
  };

  const loadProject = async () => {
    try {
      const authResult = await clientAuth.getCurrentUser();
      if (!authResult.success || !authResult.user) {
        router.push("/login");
        return;
      }

      // Get project from LocalDB (already checked in useEffect)
      const localProject = getProjectBySlug(slug);

      if (localProject) {
        // Project exists in LocalDB, just sync with Appwrite in background
        await Promise.all([
          syncMessages(localProject.$id, authResult.user.$id),
          syncFiles(localProject.$id),
        ]);

        // Update files in projectStore after sync
        const updatedFiles = getFileTree(localProject.$id);
        if (updatedFiles.length > 0) {
          setFiles(updatedFiles);
        }

        setIsInitialLoad(false);
      } else {
        // Not in LocalDB - need to fetch from Appwrite
        const { createClientSideClient } = await import(
          "@/lib/appwrite/config"
        );
        const { DATABASE_ID, COLLECTIONS } = await import(
          "@/lib/appwrite/config"
        );
        const { Query } = await import("appwrite");
        const { databases } = createClientSideClient();

        const response = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.PROJECTS,
          [
            Query.equal("slug", slug),
            Query.equal("userId", authResult.user.$id),
            Query.limit(1),
          ]
        );

        if (response.documents.length === 0) {
          setProjectNotFound(true);
          setIsInitialLoad(false);
          return;
        }

        const projectData = response.documents[0] as any;
        setCurrentProject(projectData);

        // Load and sync messages and files from Appwrite
        await Promise.all([
          syncMessages(projectData.$id, authResult.user.$id),
          syncFiles(projectData.$id),
        ]);

        // Set files in projectStore after sync
        const syncedFiles = getFileTree(projectData.$id);
        setFiles(syncedFiles.length > 0 ? syncedFiles : []);

        setIsInitialLoad(false);
      }
    } catch (error) {
      console.error("Error loading project:", error);
      setProjectNotFound(true);
      setIsInitialLoad(false);
    }
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
            sidebarCollapsed ? "w-0" : "w-[300px]"
          )}
        >
          <div className="flex-1 min-h-0">
            <ChatInterface projectId={currentProject.$id} className="h-full" />
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
  );
}
