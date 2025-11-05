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
import {
  Sparkles,
  Send,
  Search,
  Folder,
  ChevronDown,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  File,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { ShineBorder } from "@/components/ui/ShineBorder";
import { LineShadowText } from "@/components/ui/LineShadowText";
import { AnimatedShinyText } from "@/components/ui/AnimatedShinyText";
import { motion } from "framer-motion";
import type { FileAttachment } from "@/components/chat/MessageInput";

// Static prefix and dynamic suggestions
const PLACEHOLDER_PREFIX = "Ask VibeIt to ";
const PLACEHOLDER_SUGGESTIONS = [
  "create a todo app ...",
  "generate a landing page for your Food Ordering website ...",
  "build a Portfolio website with random data ...",
  "develop a Flappy Bird game ...",
  "design an e-commerce store with cart functionality ...",
  "create a portfolio website with dark mode toggle ...",
  "build a blog platform with markdown support ...",
  "generate a quiz app with multiple-choice questions ...",
];

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
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [placeholderText, setPlaceholderText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    loadFromLocalDB();
    if (user) {
      syncWithAppwrite(user.$id).catch(console.error);
    }
  }, [user]);

  // Cursor blinking effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530); // Blink every 530ms

    return () => clearInterval(cursorInterval);
  }, []);

  // Animated placeholder typewriter effect
  useEffect(() => {
    let currentIndex = 0;
    let currentCharIndex = 0;
    let isDeleting = false;
    let timeoutId: NodeJS.Timeout;

    const typeWriter = () => {
      const currentSuggestion = PLACEHOLDER_SUGGESTIONS[currentIndex];

      if (!isDeleting) {
        // Typing forward
        if (currentCharIndex <= currentSuggestion.length) {
          setPlaceholderText(currentSuggestion.slice(0, currentCharIndex));
          currentCharIndex++;
          timeoutId = setTimeout(typeWriter, 60); // Typing speed
        } else {
          // Finished typing, wait before deleting
          timeoutId = setTimeout(() => {
            isDeleting = true;
            typeWriter();
          }, 2500); // Pause at end
        }
      } else {
        // Deleting backward
        if (currentCharIndex > 0) {
          currentCharIndex--;
          setPlaceholderText(currentSuggestion.slice(0, currentCharIndex));
          timeoutId = setTimeout(typeWriter, 30); // Deleting speed (faster)
        } else {
          // Finished deleting, move to next suggestion
          isDeleting = false;
          currentIndex = (currentIndex + 1) % PLACEHOLDER_SUGGESTIONS.length;
          currentCharIndex = 0;
          timeoutId = setTimeout(typeWriter, 500); // Brief pause before next
        }
      }
    };

    // Start the animation
    timeoutId = setTimeout(typeWriter, 1000);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []); // Empty dependency array - runs once on mount

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
      setUploadingFiles((prev) =>
        prev.filter((name) => !fileNames.includes(name))
      );
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
    if (contentType.startsWith("image/"))
      return <ImageIcon className="h-4 w-4" />;
    if (contentType.includes("pdf") || contentType.includes("document"))
      return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleEnhancePrompt = async () => {
    if (!idea.trim() || isEnhancing) return;

    setIsEnhancing(true);

    try {
      const response = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: idea,
          isFirstMessage: true,
        }),
      });

      if (!response.ok) throw new Error("Failed to enhance prompt");

      const data = await response.json();

      if (data.success && data.enhancedPrompt) {
        setIdea(data.enhancedPrompt);
      }
    } catch (error) {
      console.error("Error enhancing prompt:", error);
      alert("Failed to enhance prompt. Please try again.");
    } finally {
      setIsEnhancing(false);
    }
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
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* Gradient background with grain effect */}
      <div className="flex flex-col items-end absolute -right-60 -top-10 blur-xl z-0">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0, ease: "easeOut" }}
          style={{ transformOrigin: "top right" }}
          className="h-[10rem] rounded-full w-[60rem] z-1 bg-gradient-to-b blur-[6rem] from-blue-600 to-sky-800"
        ></motion.div>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
          style={{ transformOrigin: "top right" }}
          className="h-[10rem] rounded-full w-[90rem] z-1 bg-gradient-to-b blur-[6rem] from-blue-900 to-blue-400"
        ></motion.div>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.4, ease: "easeOut" }}
          style={{ transformOrigin: "top right" }}
          className="h-[10rem] rounded-full w-[60rem] z-1 bg-gradient-to-b blur-[6rem] from-neutral-600 to-sky-600"
        ></motion.div>
      </div>
      <div className="absolute inset-0 z-0 bg-noise opacity-20"></div>

      {/* Content container */}
      <div className="relative z-10">
        <Navbar />

        {/* Main Content */}
        <main className="container mx-auto px-4 py-16 pt-24">
          <div className="max-w-4xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-foreground/5 border border-foreground/20 mb-6"
              >
                ✨
                <AnimatedShinyText
                  shimmerWidth={250}
                  className="text-sm font-medium"
                >
                  Transform Ideas Into Reality
                </AnimatedShinyText>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-5xl md:text-6xl font-semibold mb-6"
              >
                <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Have something in mind?
                </span>
                <br />
                <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Let's{" "}
                </span>
                <LineShadowText
                  className="font-brand text-5xl md:text-6xl font-bold"
                  shadowColor="rgba(255, 255, 255, 0.5)"
                >
                  Vibe It
                </LineShadowText>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-lg text-foreground/85 mb-12 max-w-2xl mx-auto"
              >
                Turn your vision into reality with AI. Just describe your idea
                and watch it come to life—complete codebase, files, and
                functionality in seconds.
              </motion.p>
            </div>

            {/* Idea Input Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.6 }}
              className="relative bg-card border-2 outline-0 border-accent-foreground/15 outline-border rounded-3xl p-4 shadow-2xl mb-28 overflow-hidden"
            >
              <ShineBorder
                borderWidth={1}
                duration={10}
                shineColor={[
                  "#000000",
                  "#1e3a8a",
                  "#3b82f6",
                  "#60a5fa",
                  "#ffffff",
                ]}
              />
              <div className="space-y-3 relative z-10">
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
                    placeholder={`${PLACEHOLDER_PREFIX}${placeholderText}${
                      showCursor ? "|" : ""
                    }`}
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
                    <motion.button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isCreating}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 17,
                      }}
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-xl  p-2 bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Attach files"
                    >
                      <Paperclip className="w-4 h-4" />
                      Attach
                    </motion.button>

                    <div className="flex items-center gap-2">
                      <motion.button
                        type="button"
                        onClick={handleEnhancePrompt}
                        disabled={!idea.trim() || isEnhancing || isCreating}
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        whileTap={{ scale: 0.95, rotate: -5 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 17,
                        }}
                        className="flex cursor-pointer items-center justify-center w-10 h-10 rounded-full bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Enhance prompt"
                      >
                        {isEnhancing ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                      </motion.button>

                      <motion.button
                        onClick={handleCreateProject}
                        disabled={
                          (!idea.trim() && attachments.length === 0) ||
                          isCreating
                        }
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 17,
                        }}
                        className="flex cursor-pointer items-center justify-center w-10 h-10 rounded-full bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Create project"
                      >
                        {isCreating ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-muted-foreground border-t-transparent" />
                        ) : (
                          <Send className="w-4 h-4 text-foreground" />
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Projects Section */}
          {projects.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.8 }}
              className="max-w-7xl mx-auto"
            >
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
                      <DropdownItem
                        onClick={() => setDateFilter("alphabetical")}
                      >
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
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}
