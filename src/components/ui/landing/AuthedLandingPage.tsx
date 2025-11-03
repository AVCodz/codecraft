/**
 * AuthedLandingPage - Landing page for authenticated users
 * Allows users to quickly start a new project by describing their idea
 * Features: Idea input, instant project creation, auto-navigation, project grid
 * Used in: Home page (/) when user is authenticated
 */
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/authStore";
import { useProjectsStore } from "@/lib/stores/projectsStore";
import { Navbar } from "@/components/ui/layout/Navbar";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { Sparkles, Send, Search, Folder, ChevronDown, Paperclip, X, FileText, Image as ImageIcon, File } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import type { FileAttachment } from "@/components/chat/MessageInput";

export function AuthedLandingPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    addProject,
    projects,
    loadFromLocalDB,
    syncWithAppwrite,
    updateProject,
    deleteProject,
  } = useProjectsStore();
  const [idea, setIdea] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<
    "recent" | "oldest" | "alphabetical"
  >("recent");
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    loadFromLocalDB();
    if (user) {
      syncWithAppwrite(user.$id).catch(console.error);
    }
  }, [user]);

  const handleRenameProject = async (projectId: string, newName: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newName }),
      });

      if (!response.ok) throw new Error("Failed to rename project");

      const { project: updatedProject } = await response.json();
      updateProject(projectId, updatedProject);
    } catch (error) {
      console.error("Error renaming project:", error);
      throw error;
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete project");

      deleteProject(projectId);
    } catch (error) {
      console.error("Error deleting project:", error);
      throw error;
    }
  };

  const uploadFiles = async (files: File[]) => {
    const fileNames = files.map((f) => f.name);
    setUploadingFiles((prev) => [...prev, ...fileNames]);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      setAttachments((prev) => [...prev, ...data.attachments]);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload files. Please try again.");
    } finally {
      setUploadingFiles((prev) => prev.filter((name) => !fileNames.includes(name)));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) uploadFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) uploadFiles(files);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const files = items
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);
    if (files.length > 0) {
      e.preventDefault();
      uploadFiles(files);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
    if (contentType.includes("pdf") || contentType.includes("document"))
      return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleCreateProject = async () => {
    const trimmedIdea = idea.trim();
    if ((!trimmedIdea && attachments.length === 0) || isCreating) return;

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
          content: trimmedIdea || "Project created with attachments",
          sequence: 0,
          createdAt: now,
          updatedAt: now,
          metadata:
            attachments.length > 0
              ? JSON.stringify({ attachments })
              : undefined,
        }
      );

      console.log("[AuthedLandingPage] Created initial message:", userMessage);

      // Clear form
      setIdea("");
      setAttachments([]);

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

  const filteredProjects = projects
    .filter(
      (project) =>
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (dateFilter === "recent") {
        return (
          new Date(b.$updatedAt).getTime() - new Date(a.$updatedAt).getTime()
        );
      } else if (dateFilter === "oldest") {
        return (
          new Date(a.$updatedAt).getTime() - new Date(b.$updatedAt).getTime()
        );
      } else {
        return a.title.localeCompare(b.title);
      }
    });

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
          <div className="bg-card border border-border rounded-3xl p-6 shadow-2xl mb-16">
            <div className="space-y-3">
              {/* Attachments Preview */}
              {(attachments.length > 0 || uploadingFiles.length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border border-border"
                    >
                      {attachment.contentType.startsWith("image/") ? (
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="h-8 w-8 object-cover rounded"
                        />
                      ) : (
                        getFileIcon(attachment.contentType)
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {attachment.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.size)}
                          {attachment.textContent && " • Text extracted"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="p-1 hover:bg-background rounded"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {uploadingFiles.map((fileName, index) => (
                    <div
                      key={`uploading-${index}`}
                      className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border border-border opacity-60"
                    >
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {fileName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Uploading...
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div
                className="relative"
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,.pdf,.txt,.docx"
                />
                <textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder="What do you want to create today?"
                  className={`w-full px-1 py-2 bg-transparent border-none focus:outline-none resize-none text-foreground placeholder:text-muted-foreground text-base min-h-[120px] ${
                    isDragging ? "opacity-50" : ""
                  }`}
                  disabled={isCreating}
                />
                {isDragging && (
                  <div className="absolute inset-0 border-2 border-dashed border-primary rounded-lg bg-primary/5 flex items-center justify-center">
                    <p className="text-sm text-primary font-medium">
                      Drop files here
                    </p>
                  </div>
                )}

                {/* Bottom Actions Bar */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCreating}
                    className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Attach files"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleCreateProject}
                    disabled={
                      (!idea.trim() && attachments.length === 0) || isCreating
                    }
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
        </div>

        {/* Projects Section */}
        {projects.length > 0 && (
          <div className="max-w-7xl mx-auto">
            {/* Background Container with Rounded Borders */}
            <div className="bg-card/30 backdrop-blur-sm border border-border rounded-3xl p-12 shadow-xl">
              {/* Header with Search and Filter */}
              <div className="mb-8">
                {/* Username's Projects Heading */}
                <h2 className="text-3xl font-bold mb-6">
                  {user?.name ? `${user.name}'s Projects` : "Your Projects"}
                </h2>

                <div className="flex items-center gap-4 flex-wrap">
                  {/* Search Bar */}
                  <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search projects..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Filter by Date */}
                  <Dropdown
                    trigger={
                      <button className="flex items-center gap-2 px-4 py-2 bg-background/50 border border-border rounded-lg hover:bg-muted transition-colors">
                        <span className="text-sm font-medium">
                          {dateFilter === "recent"
                            ? "Most Recent"
                            : dateFilter === "oldest"
                            ? "Oldest First"
                            : "A-Z"}
                        </span>
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    }
                    align="right"
                  >
                    <DropdownItem onClick={() => setDateFilter("recent")}>
                      Most Recent
                    </DropdownItem>
                    <DropdownItem onClick={() => setDateFilter("oldest")}>
                      Oldest First
                    </DropdownItem>
                    <DropdownItem onClick={() => setDateFilter("alphabetical")}>
                      A-Z
                    </DropdownItem>
                  </Dropdown>
                </div>
              </div>

              {/* Projects Grid */}
              {filteredProjects.length === 0 ? (
                <div className="text-center py-12">
                  <Folder className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">
                    No projects found
                  </h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search query
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProjects.map((project) => (
                    <ProjectCard
                      key={project.$id}
                      project={project}
                      onRename={handleRenameProject}
                      onDelete={handleDeleteProject}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
