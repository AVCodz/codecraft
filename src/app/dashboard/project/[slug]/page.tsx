"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/lib/stores/projectStore";
import { useUIStore } from "@/lib/stores/uiStore";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { FileTree } from "@/components/editor/FileTree";
import { Preview } from "@/components/preview/Preview";
import { Terminal } from "@/components/terminal/Terminal";
import { Button } from "@/components/ui/Button";

import { buildFileTree } from "@/lib/utils/fileSystem";
import { clientAuth } from "@/lib/appwrite/auth";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Terminal as TerminalIcon,
  Download,
  Settings,
  Home,
  Code,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils/helpers";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const router = useRouter();
  const { currentProject, setCurrentProject, setFiles, isLoading, setLoading } =
    useProjectStore();
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

  useEffect(() => {
    params.then((p) => setSlug(p.slug));
  }, [params]);

  useEffect(() => {
    if (slug) {
      checkAuthAndLoadProject();
    }
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

  const loadProject = async () => {
    setLoading(true);

    try {
      const { createClientSideClient } = await import("@/lib/appwrite/config");
      const { DATABASE_ID, COLLECTIONS } = await import(
        "@/lib/appwrite/config"
      );
      const { Query } = await import("appwrite");
      const { databases } = createClientSideClient();

      const authResult = await clientAuth.getCurrentUser();
      if (!authResult.success || !authResult.user) {
        router.push("/login");
        return;
      }

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
        console.error("Project not found");
        router.push("/dashboard");
        return;
      }

      const projectData = response.documents[0] as any;
      setCurrentProject(projectData);

      const filesResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PROJECT_FILES,
        [Query.equal("projectId", projectData.$id)]
      );

      const fileTree = buildFileTree(filesResponse.documents as any);
      setFiles(fileTree);
    } catch (error) {
      console.error("Error loading project:", error);
      router.push("/dashboard");
    } finally {
      setLoading(false);
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Project not found</h2>
          <p className="text-muted-foreground mb-4">
            The project you're looking for doesn't exist.
          </p>
          <Button onClick={() => router.push("/dashboard")}>
            <Home className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
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
            sidebarCollapsed ? "w-0" : "w-[600px]"
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
