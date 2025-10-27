/**
 * AuthedLandingPage - Landing page for authenticated users
 * Allows users to quickly start a new project by describing their idea
 * Features: Idea input, instant project creation, auto-navigation
 * Used in: Home page (/) when user is authenticated
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/authStore";
import { useProjectsStore } from "@/lib/stores/projectsStore";
import { Button } from "@/components/ui/Button";
import { Navbar } from "@/components/ui/layout/Navbar";
import { Sparkles, ArrowRight } from "lucide-react";

export function AuthedLandingPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addProject } = useProjectsStore();
  const [idea, setIdea] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateProject = async () => {
    const trimmedIdea = idea.trim();
    if (!trimmedIdea || isCreating) return;

    setIsCreating(true);

    try {
      const { createClientSideClient } = await import("@/lib/appwrite/config");
      const { DATABASE_ID, COLLECTIONS } = await import(
        "@/lib/appwrite/config"
      );
      const { ID } = await import("appwrite");
      const { useFilesStore } = await import("@/lib/stores/filesStore");

      if (!user) {
        console.error("No user found");
        return;
      }

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
      addProject(project as any);

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

      console.log("[AuthedLandingPage] Created initial message:", userMessage);

      // Navigate to project - realtime will sync the message
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
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCreateProject();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16 pt-24">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">
                AI-Powered Development
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Build beautiful projects with CodeCraft
            </h1>

            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              Describe your idea and let AI scaffold the repo, files, and code
              in seconds. From concept to working prototype instantly.
            </p>
          </div>

          {/* Idea Input Card */}
          <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3 text-foreground">
                What do you want to build?
              </label>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="E.g., A todo app with drag-and-drop, dark mode, and local storage..."
                className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-foreground placeholder:text-muted-foreground"
                rows={4}
                disabled={isCreating}
              />
            </div>

            <Button
              onClick={handleCreateProject}
              disabled={!idea.trim() || isCreating}
              className="w-full py-6 text-lg font-semibold"
              size="lg"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Creating your project...
                </>
              ) : (
                <>
                  Create Project
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>

          {/* Quick Info */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 rounded-lg bg-card/50 border border-border/50">
              <div className="text-3xl font-bold text-primary mb-2">⚡</div>
              <h3 className="font-semibold mb-1">Instant Setup</h3>
              <p className="text-sm text-muted-foreground">
                Full project structure in seconds
              </p>
            </div>

            <div className="text-center p-6 rounded-lg bg-card/50 border border-border/50">
              <div className="text-3xl font-bold text-primary mb-2">🤖</div>
              <h3 className="font-semibold mb-1">AI-Powered</h3>
              <p className="text-sm text-muted-foreground">
                Smart code generation and suggestions
              </p>
            </div>

            <div className="text-center p-6 rounded-lg bg-card/50 border border-border/50">
              <div className="text-3xl font-bold text-primary mb-2">🎨</div>
              <h3 className="font-semibold mb-1">Beautiful UI</h3>
              <p className="text-sm text-muted-foreground">
                Modern design with Tailwind CSS
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
