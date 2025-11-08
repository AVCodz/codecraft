"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProjectStore } from "@/lib/stores/projectStore";
import { useAuthStore } from "@/lib/stores/authStore";
import { DottedGlowBackground } from "@/components/ui/DottedGlowBackground";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DeleteProjectDialog } from "@/components/project/DeleteProjectDialog";
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/Dropdown";
import Logo from "@/components/ui/icon/logo";
import {
  Save,
  Trash2,
  Calendar,
  Clock,
  LogOut,
  LayoutDashboard,
  ArrowLeft,
  Edit3,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { formatRelativeTime } from "@/lib/utils/helpers";

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const { user } = useAuthStore();
  const { currentProject, setCurrentProject } = useProjectStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [framework, setFramework] = useState("react");
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const loadProjectData = async () => {
      if (!projectId || !user) return;

      try {
        const { createClientSideClient } = await import(
          "@/lib/appwrite/config"
        );
        const { DATABASE_ID, COLLECTIONS } = await import(
          "@/lib/appwrite/config"
        );
        const { databases } = createClientSideClient();

        const project = await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.PROJECTS,
          projectId
        );

        setCurrentProject(project as any);
      } catch (error) {
        console.error("Error loading project:", error);
      }
    };

    loadProjectData();
  }, [projectId, user, setCurrentProject]);

  useEffect(() => {
    if (currentProject) {
      setTitle(currentProject.title || "");
      setDescription(currentProject.description || "");
      setFramework(currentProject.framework || "react");
      setStatus(currentProject.status || "active");
    }
  }, [currentProject]);

  const handleSave = async () => {
    if (!currentProject || !user) return;

    setIsSaving(true);

    try {
      const { createClientSideClient } = await import("@/lib/appwrite/config");
      const { DATABASE_ID, COLLECTIONS } = await import(
        "@/lib/appwrite/config"
      );
      const { databases } = createClientSideClient();

      const updatedProject = await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.PROJECTS,
        projectId,
        {
          title,
          description,
          status,
        }
      );

      setCurrentProject(updatedProject as any);
      setIsEditing(false);

      toast.success("Project updated successfully", {
        duration: 3000,
        position: "top-right",
        style: {
          background: "#1f2937",
          color: "#fff",
          border: "1px solid #374151",
        },
      });
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("Failed to update project", {
        duration: 3000,
        position: "top-right",
        style: {
          background: "#1f2937",
          color: "#fff",
          border: "1px solid #374151",
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteComplete = () => {
    router.push("/dashboard");
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Navbar */}
      <header className="fixed top-0 left-0 right-0 border-b border-border bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="grid grid-cols-3 items-center">
            {/* Left: Logo & Brand as button */}
            <button
              onClick={() => router.push("/")}
              className="flex cursor-pointer items-center gap-2 hover:opacity-80 transition-opacity w-fit"
            >
              <Logo size={24} className="text-primary flex-shrink-0" />
              <span className="font-brand text-xl font-bold">VibeIt</span>
            </button>

            {/* Center: Project Name */}
            <div className="flex justify-center">
              <h1 className="text-lg font-semibold truncate max-w-[300px]">
                {currentProject.title}
              </h1>
            </div>

            {/* Right: User Dropdown */}
            <div className="flex justify-end">
              <Dropdown
                align="right"
                trigger={
                  <button
                    className="flex cursor-pointer items-center gap-2 bg-muted/60 hover:bg-muted/40 rounded-lg transition-colors"
                    title={user?.email}
                  >
                    <span className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary text-white font-semibold text-lg">
                      {user?.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 1) || "U"}
                    </span>
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
          </div>
        </div>
      </header>

      {/* Content with top padding to account for fixed navbar */}
      <div className="container mx-auto px-4 py-8 max-w-6xl pt-24">
        {/* Page Title */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Project Settings</h2>
            <p className="text-muted-foreground mt-2">
              Manage your project configuration and details
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`/project/${projectId}`)}
            className="cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Project
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Takes 2 cols */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Thumbnail */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-card border border-border rounded-lg p-6"
            >
              <h2 className="text-lg font-semibold mb-4">Project Thumbnail</h2>
              <div className="relative w-full aspect-video bg-card/50 border border-border rounded-lg overflow-hidden">
                <DottedGlowBackground
                  gap={16}
                  radius={1.5}
                  color="rgba(100, 116, 139, 0.4)"
                  darkColor="rgba(148, 163, 184, 0.3)"
                  glowColor="rgba(59, 130, 246, 0.6)"
                  darkGlowColor="rgba(96, 165, 250, 0.5)"
                  opacity={0.5}
                  speedMin={0.8}
                  speedMax={1.8}
                  speedScale={1.5}
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle at center, transparent 0%, transparent 30%, rgba(0, 0, 0, 0.3) 60%, rgba(0, 0, 0, 0.8) 100%)",
                  }}
                />
              </div>
            </motion.div>

            {/* General Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-card border border-border rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">General Information</h2>
                {!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="cursor-pointer"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Project Name
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter project name"
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter project description"
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                    rows={3}
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Framework
                  </label>
                  <Input
                    value={framework.charAt(0).toUpperCase() + framework.slice(1)}
                    disabled
                    className="capitalize"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Status
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="active"
                        checked={status === "active"}
                        onChange={(e) =>
                          setStatus(e.target.value as "active" | "archived")
                        }
                        className="w-4 h-4 text-primary"
                        disabled={!isEditing}
                      />
                      <span className="text-sm">Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="archived"
                        checked={status === "archived"}
                        onChange={(e) =>
                          setStatus(e.target.value as "active" | "archived")
                        }
                        className="w-4 h-4 text-primary"
                        disabled={!isEditing}
                      />
                      <span className="text-sm">Archived</span>
                    </label>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Takes 1 col */}
          <div className="space-y-6">
            {/* Project Metadata */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-card border border-border rounded-lg p-6"
            >
              <h2 className="text-lg font-semibold mb-4">Project Metadata</h2>
              <div className="space-y-3 text-sm">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Created</span>
                  </div>
                  <span className="pl-6">
                    {formatRelativeTime(currentProject.$createdAt)}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Last Updated</span>
                  </div>
                  <span className="pl-6">
                    {formatRelativeTime(currentProject.$updatedAt)}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Danger Zone */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-destructive/10 border border-destructive/20 rounded-lg p-6"
            >
              <h2 className="text-lg font-semibold mb-2 text-destructive">
                Danger Zone
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Once you delete a project, there is no going back. Please be
                certain.
              </p>
              <Button
                variant="destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="w-full cursor-pointer"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Project
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <DeleteProjectDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        projectId={projectId}
        projectTitle={currentProject.title}
        onDeleteComplete={handleDeleteComplete}
      />
    </div>
  );
}
