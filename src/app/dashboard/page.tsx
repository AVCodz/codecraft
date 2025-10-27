"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import { useAuthStore } from "@/lib/stores/authStore";
import { useProjectsStore } from "@/lib/stores/projectsStore";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Navbar } from "@/components/ui/layout/Navbar";
import {
  Plus,
  Search,
  Calendar,
  Folder,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/helpers";

const PROJECTS_PER_PAGE = 15;

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, checkAuth, user } = useAuthStore();

  // Use new stores
  const {
    projects: allProjects,
    isLoading,
    loadFromLocalDB,
    syncWithAppwrite,
    addProject,
    currentPage,
    setPage,
  } = useProjectsStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projectIdea, setProjectIdea] = useState("");

  // Load projects with parallel LocalDB + Appwrite pattern
  useEffect(() => {
    // STEP 1: Load LocalDB data IMMEDIATELY (synchronous, instant UI)
    console.log("[Dashboard] 📂 Loading projects from LocalDB...");
    loadFromLocalDB();

    // STEP 2: Simultaneously check auth and sync with Appwrite in background
    console.log("[Dashboard] 🔄 Starting background Appwrite sync...");
    checkAuthAndSyncInBackground();
  }, []); // Empty deps - only run once on mount

  // Setup realtime subscription for projects
  useEffect(() => {
    if (!user) return;

    console.log(
      "[Dashboard] 🔴 Setting up realtime subscription for projects..."
    );

    let unsubscribeFn: (() => void) | undefined;

    const setupRealtime = async () => {
      const { realtimeService } = await import(
        "@/lib/appwrite/realtimeService"
      );
      const { useProjectsStore } = await import("@/lib/stores/projectsStore");

      const projectsStore = useProjectsStore.getState();

      unsubscribeFn = realtimeService.subscribeToProjects(user.$id, {
        onCreate: (project) => {
          console.log(
            "[Dashboard Realtime] ➕ Project created:",
            project.title
          );
          projectsStore.addProject(project);
        },
        onUpdate: (project) => {
          console.log(
            "[Dashboard Realtime] 🔄 Project updated:",
            project.title
          );
          projectsStore.updateProject(project.$id, project);
        },
        onDelete: (projectId) => {
          console.log("[Dashboard Realtime] ❌ Project deleted:", projectId);
          projectsStore.deleteProject(projectId);
        },
      });
    };

    setupRealtime();

    return () => {
      if (unsubscribeFn) {
        console.log("[Dashboard] 🛑 Cleaning up realtime subscription");
        unsubscribeFn();
      }
    };
  }, [user]);

  const checkAuthAndSyncInBackground = async () => {
    try {
      // Check authentication
      await checkAuth();

      if (!isAuthenticated) {
        // Check if we have data in LocalDB before redirecting
        const hasLocalData =
          typeof window !== "undefined" &&
          localStorage.getItem("codeCraft_projects") &&
          JSON.parse(
            localStorage.getItem("codeCraft_projects") || '{"items":[]}'
          ).items.length > 0;

        if (!hasLocalData) {
          console.log(
            "[Dashboard] ⚠️ No auth and no local data, redirecting to login"
          );
          router.push("/login");
        } else {
          console.log(
            "[Dashboard] ℹ️ Auth failed but continuing with local data"
          );
        }
        return;
      }

      // Sync with Appwrite in background without blocking UI
      // LocalDB data is already shown, this will update in background
      if (user) {
        console.log(
          "[Dashboard] 🔄 Syncing with Appwrite for user:",
          user.email
        );
        await syncWithAppwrite(user.$id);
        console.log("[Dashboard] ✅ Background sync completed");
      }
    } catch (error) {
      console.error("[Dashboard] ❌ Background sync error:", error);

      // Check if we have data in LocalDB before redirecting
      const hasLocalData =
        typeof window !== "undefined" &&
        localStorage.getItem("codeCraft_projects") &&
        JSON.parse(localStorage.getItem("codeCraft_projects") || '{"items":[]}')
          .items.length > 0;

      if (!hasLocalData) {
        console.log(
          "[Dashboard] ⚠️ Error and no local data, redirecting to login"
        );
        router.push("/login");
      } else {
        console.log("[Dashboard] ℹ️ Error but continuing with local data");
      }
    }
  };

  const handleCreateProject = async () => {
    const trimmedIdea = projectIdea.trim();
    if (!trimmedIdea) return;

    try {
      const { createClientSideClient } = await import("@/lib/appwrite/config");
      const { DATABASE_ID, COLLECTIONS } = await import(
        "@/lib/appwrite/config"
      );
      const { ID } = await import("appwrite");
      const { useFilesStore } = await import("@/lib/stores/filesStore");

      if (!user) return;

      const { databases } = createClientSideClient();
      const now = new Date().toISOString();

      // Create project with default title "New Project"
      const project = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.PROJECTS,
        ID.unique(),
        {
          userId: user.$id,
          title: "New Project",
          slug: `new-project-${Date.now()}`,
          description: "",
          status: "active",
          framework: "react",
          lastMessageAt: now,
          createdAt: now,
          updatedAt: now,
        }
      );

      // Add to store and LocalDB
      addProject(project as unknown as Parameters<typeof addProject>[0]);

      // Initialize empty files in LocalDB
      const filesStore = useFilesStore.getState();
      filesStore.setFiles(project.$id, []);

      // Create the initial user message in the database
      const userMessage = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.MESSAGES,
        ID.unique(),
        {
          projectId: project.$id,
          userId: user.$id,
          role: "user",
          content: trimmedIdea,
          sequence: 0, // First message
          createdAt: now,
          updatedAt: now,
        }
      );

      console.log("[Dashboard] Created initial message:", userMessage);

      setIsCreateModalOpen(false);
      setProjectIdea("");

      // Navigate to the new project - realtime will sync the message
      router.push(`/project/${project.$id}`);

      // Fire-and-forget: Generate project name in background
      fetch(`/api/projects/${project.$id}/generate-name`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: trimmedIdea, userId: user.$id }),
      }).catch((err) => {
        console.error("Failed to generate project name:", err);
      });
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    // Get stores
    const { useProjectsStore } = await import("@/lib/stores/projectsStore");
    const { useMessagesStore } = await import("@/lib/stores/messagesStore");
    const { useFilesStore } = await import("@/lib/stores/filesStore");
    const projectsStore = useProjectsStore.getState();
    const messagesStore = useMessagesStore.getState();
    const filesStore = useFilesStore.getState();

    // Save current state for rollback if needed
    const currentProject = allProjects.find((p) => p.$id === projectId);

    try {
      // ⚡ STEP 1: INSTANT UI UPDATE (Optimistic)
      console.log("[Dashboard] 🗑️ Optimistically removing project from UI...");
      projectsStore.deleteProject(projectId);
      messagesStore.clearProjectMessages(projectId);
      filesStore.clearProjectFiles(projectId);

      // ⚡ STEP 2: Delete from Appwrite in PARALLEL (background)
      console.log("[Dashboard] 🔄 Deleting from Appwrite in background...");
      const { createClientSideClient } = await import("@/lib/appwrite/config");
      const { DATABASE_ID, COLLECTIONS } = await import(
        "@/lib/appwrite/config"
      );
      const { Query } = await import("appwrite");
      const { databases } = createClientSideClient();

      // Fetch all related data in PARALLEL
      const [filesResponse, messagesResponse] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTIONS.PROJECT_FILES, [
          Query.equal("projectId", projectId),
          Query.limit(1000),
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTIONS.MESSAGES, [
          Query.equal("projectId", projectId),
          Query.limit(1000),
        ]),
      ]);

      // Delete all files in PARALLEL
      const fileDeletePromises = filesResponse.documents.map((file) =>
        databases.deleteDocument(
          DATABASE_ID,
          COLLECTIONS.PROJECT_FILES,
          file.$id
        )
      );

      // Delete all messages in PARALLEL
      const messageDeletePromises = messagesResponse.documents.map((message) =>
        databases.deleteDocument(DATABASE_ID, COLLECTIONS.MESSAGES, message.$id)
      );

      // Delete project
      const projectDeletePromise = databases.deleteDocument(
        DATABASE_ID,
        COLLECTIONS.PROJECTS,
        projectId
      );

      // Wait for ALL deletions in PARALLEL
      await Promise.all([
        ...fileDeletePromises,
        ...messageDeletePromises,
        projectDeletePromise,
      ]);

      console.log("[Dashboard] ✅ Project deleted successfully");
    } catch (error) {
      console.error("[Dashboard] ❌ Error deleting project:", error);

      // Rollback: Restore project in UI if deletion failed
      if (currentProject) {
        console.log("[Dashboard] ⏪ Rolling back - restoring project to UI");
        projectsStore.addProject(currentProject);
      }

      alert("Failed to delete project. Please try again.");
    }
  };

  // Filter and paginate projects
  const filteredProjects = allProjects.filter(
    (project) =>
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startIndex = (currentPage - 1) * PROJECTS_PER_PAGE;
  const endIndex = startIndex + PROJECTS_PER_PAGE;
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setPage(currentPage - 1);
    }
  };

  // Only show loader on very first load when we have no data at all
  // Since we load from LocalDB immediately, this will only show for new users
  if (isLoading && allProjects.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <Navbar />

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8 pt-20">
          {/* Search and Create */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>

            <Dialog
              open={isCreateModalOpen}
              onOpenChange={setIsCreateModalOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      What do you want to build?
                    </label>
                    <textarea
                      value={projectIdea}
                      onChange={(e) => setProjectIdea(e.target.value)}
                      placeholder="E.g., A todo app with drag-and-drop, dark mode, and local storage..."
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-foreground placeholder:text-muted-foreground"
                      rows={4}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateProject}
                      disabled={!projectIdea.trim()}
                    >
                      Create Project
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Projects Grid */}
          {filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                {allProjects.length === 0
                  ? "No projects yet"
                  : "No projects found"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {allProjects.length === 0
                  ? "Create your first project to get started with AI-powered development"
                  : "Try adjusting your search query"}
              </p>
              {allProjects.length === 0 && (
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Project
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedProjects.map((project) => (
                  <div
                    key={project.$id}
                    className="group border border-border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/project/${project.$id}`)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                          {project.title}
                        </h3>
                        {project.description && (
                          <p className="text-muted-foreground text-sm line-clamp-2">
                            {project.description}
                          </p>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project.$id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {formatRelativeTime(project.$updatedAt)}
                      </div>
                      <div className="capitalize px-2 py-1 bg-muted rounded text-xs">
                        {project.framework}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>

                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
