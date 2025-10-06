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
import { Project } from "@/lib/types";
import { useAuthStore } from "@/lib/stores/authStore";
import { AuthGuard } from "@/components/auth/AuthGuard";
import {
  Plus,
  Search,
  Calendar,
  Folder,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/helpers";
import { cn } from "@/lib/utils/helpers";

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, signOut, checkAuth } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    framework: "react" as "react" | "vue" | "vanilla",
  });

  // Check authentication and load projects
  useEffect(() => {
    checkAuthAndLoadProjects();
  }, []);

  const checkAuthAndLoadProjects = async () => {
    try {
      await checkAuth();

      if (!isAuthenticated) {
        router.push("/login");
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      await loadProjects();
    } catch (error) {
      console.error("Auth check failed:", error);
      router.push("/login");
    }
  };

  const loadProjects = async () => {
    try {
      const { databases } = await import("@/lib/appwrite/config");
      const { DATABASE_ID, COLLECTIONS } = await import("@/lib/appwrite/config");
      const { Query } = await import("appwrite");
      const { user } = useAuthStore.getState();
      
      if (!user) {
        console.error("No user found");
        return;
      }

      const { createClientSideClient } = await import("@/lib/appwrite/config");
      const { databases: clientDb } = createClientSideClient();
      
      const response = await clientDb.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PROJECTS,
        [
          Query.equal('userId', user.$id),
          Query.equal('status', 'active'),
          Query.orderDesc('lastMessageAt'),
          Query.limit(50)
        ]
      );

      setProjects(response.documents as any);
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.title.trim()) return;

    try {
      const { createClientSideClient } = await import("@/lib/appwrite/config");
      const { DATABASE_ID, COLLECTIONS } = await import("@/lib/appwrite/config");
      const { ID } = await import("appwrite");
      const { user } = useAuthStore.getState();
      
      if (!user) return;

      const { databases } = createClientSideClient();
      const slug = newProject.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      const now = new Date().toISOString();
      const project = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.PROJECTS,
        ID.unique(),
        {
          userId: user.$id,
          title: newProject.title.trim(),
          slug,
          description: newProject.description?.trim() || '',
          status: 'active',
          framework: newProject.framework || 'react',
          lastMessageAt: now,
          createdAt: now,
          updatedAt: now,
        }
      );

      setProjects([project as any, ...projects]);
      setIsCreateModalOpen(false);
      setNewProject({ title: "", description: "", framework: "react" });

      router.push(`/dashboard/project/${slug}`);
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
      const { createClientSideClient } = await import("@/lib/appwrite/config");
      const { DATABASE_ID, COLLECTIONS } = await import("@/lib/appwrite/config");
      const { Query } = await import("appwrite");
      const { databases } = createClientSideClient();

      const filesResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PROJECT_FILES,
        [Query.equal('projectId', projectId)]
      );

      for (const file of filesResponse.documents) {
        await databases.deleteDocument(
          DATABASE_ID,
          COLLECTIONS.PROJECT_FILES,
          file.$id
        );
      }

      const messagesResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.MESSAGES,
        [Query.equal('projectId', projectId)]
      );

      for (const message of messagesResponse.documents) {
        await databases.deleteDocument(
          DATABASE_ID,
          COLLECTIONS.MESSAGES,
          message.$id
        );
      }

      await databases.deleteDocument(
        DATABASE_ID,
        COLLECTIONS.PROJECTS,
        projectId
      );

      setProjects(projects.filter((p) => p.$id !== projectId));
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  const filteredProjects = projects.filter(
    (project) =>
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">CodeCraft AI</h1>
                <p className="text-muted-foreground">
                  Build amazing applications with AI
                </p>
              </div>

              <div className="flex items-center gap-4">
                <Button
                  onClick={async () => {
                    await signOut();
                    router.push("/login");
                  }}
                  variant="ghost"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
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
                  <Input
                    label="Project Name"
                    value={newProject.title}
                    onChange={(e) =>
                      setNewProject({ ...newProject, title: e.target.value })
                    }
                    placeholder="My Awesome App"
                  />
                  <Input
                    label="Description (Optional)"
                    value={newProject.description}
                    onChange={(e) =>
                      setNewProject({
                        ...newProject,
                        description: e.target.value,
                      })
                    }
                    placeholder="A brief description of your project"
                  />
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Framework
                    </label>
                    <div className="flex gap-2">
                      {(["react", "vue", "vanilla"] as const).map(
                        (framework) => (
                          <Button
                            key={framework}
                            variant={
                              newProject.framework === framework
                                ? "default"
                                : "outline"
                            }
                            onClick={() =>
                              setNewProject({ ...newProject, framework })
                            }
                            className="capitalize"
                          >
                            {framework}
                          </Button>
                        )
                      )}
                    </div>
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
                      disabled={!newProject.title.trim()}
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
                {projects.length === 0
                  ? "No projects yet"
                  : "No projects found"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {projects.length === 0
                  ? "Create your first project to get started with AI-powered development"
                  : "Try adjusting your search query"}
              </p>
              {projects.length === 0 && (
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Project
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <div
                  key={project.$id}
                  className="group border border-border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/dashboard/project/${project.slug}`)}
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
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
