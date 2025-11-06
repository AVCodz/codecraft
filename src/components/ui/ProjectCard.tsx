/**
 * ProjectCard - Display individual project with animated background
 * Shows project name, last updated, with hover dropdown menu
 * Features: Circle avatar with first letter, animated dotted background, rename/delete actions
 * Used in: Home page project grid
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { Dropdown, DropdownItem, DropdownSeparator } from "./Dropdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./Dialog";
import { Input } from "./Input";
import { Button } from "./Button";
import { DottedGlowBackground } from "./DottedGlowBackground";
import { DeleteProjectDialog } from "@/components/project/DeleteProjectDialog";
import { formatRelativeTime } from "@/lib/utils/helpers";
import type { Project } from "@/lib/types";

interface ProjectCardProps {
  project: Project;
  onRename: (projectId: string, newName: string) => Promise<void>;
  onDeleteComplete: () => void;
}

export function ProjectCard({ project, onRename, onDeleteComplete }: ProjectCardProps) {
  const router = useRouter();
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [newName, setNewName] = useState(project.title);
  const [isRenaming, setIsRenaming] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const firstLetter = project.title.charAt(0).toUpperCase();

  const handleRename = async () => {
    const trimmedName = newName.trim();
    if (!trimmedName || trimmedName === project.title) {
      setIsRenameOpen(false);
      return;
    }

    setIsRenaming(true);
    try {
      await onRename(project.$id, trimmedName);
      setIsRenameOpen(false);
    } catch (error) {
      console.error("Failed to rename project:", error);
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <>
      <div
        className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02]"
        onMouseEnter={() => setShowDropdown(true)}
        onMouseLeave={() => setShowDropdown(false)}
        onClick={() => router.push(`/project/${project.$id}`)}
      >
        {/* Animated Background Rectangle */}
        <div className="relative w-full aspect-video bg-card/50 border border-border rounded-2xl overflow-hidden">
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

          {/* Radial Gradient Fade Overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at center, transparent 0%, transparent 30%, rgba(0, 0, 0, 0.3) 60%, rgba(0, 0, 0, 0.8) 100%)",
            }}
          />

          {/* Three-dot Menu (absolute top-right) */}
          <div
            className={`absolute top-3 right-3 z-10 transition-opacity ${
              showDropdown ? "opacity-100" : "opacity-0"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <Dropdown
              trigger={
                <button className="p-2 bg-background/80 backdrop-blur-sm hover:bg-background rounded-md transition-colors border border-border">
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </button>
              }
              align="right"
            >
              <DropdownItem
                onClick={() => {
                  setIsRenameOpen(true);
                }}
              >
                <Edit className="h-4 w-4" />
                Rename Project
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem onClick={() => setIsDeleteOpen(true)} variant="destructive">
                <Trash2 className="h-4 w-4" />
                Delete Project
              </DropdownItem>
            </Dropdown>
          </div>
        </div>

        {/* Project Info Below */}
        <div className="mt-4 flex items-center gap-3">
          {/* Circle Avatar */}
          <div className="flex-shrink-0 w-12 h-12 rounded-full border-2 border-border bg-card flex items-center justify-center text-foreground font-semibold text-lg">
            {firstLetter}
          </div>

          {/* Text Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base group-hover:text-primary transition-colors truncate">
              {project.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {formatRelativeTime(project.$updatedAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Rename Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Project Name
              </label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter project name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRename();
                  }
                }}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsRenameOpen(false)}
                disabled={isRenaming}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRename}
                disabled={!newName.trim() || isRenaming}
              >
                {isRenaming ? "Renaming..." : "Rename"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Project Dialog */}
      <DeleteProjectDialog
        isOpen={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        projectId={project.$id}
        projectTitle={project.title}
        onDeleteComplete={onDeleteComplete}
      />
    </>
  );
}
