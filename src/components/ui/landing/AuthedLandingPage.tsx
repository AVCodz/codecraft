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
import { Navbar } from "@/components/ui/layout/Navbar";
import { Sparkles, Send } from "lucide-react";

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
          <div className="text-center mb-16">
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
          <div className="bg-card border border-border rounded-3xl p-6 shadow-2xl">
            <div className="relative">
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What do you want to create today?"
                className="w-full px-1 py-2 bg-transparent border-none focus:outline-none resize-none text-foreground placeholder:text-muted-foreground text-base min-h-[120px]"
                disabled={isCreating}
              />

              {/* Bottom Actions Bar */}
              <div className="flex items-center justify-end ">
                <button
                  onClick={handleCreateProject}
                  disabled={!idea.trim() || isCreating}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-primary hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Create project"
                >
                  {isCreating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-muted-foreground border-t-transparent" />
                  ) : (
                    <Send className="w-4 h-4 text-foreground" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
