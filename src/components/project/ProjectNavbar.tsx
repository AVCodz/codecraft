/**
 * ProjectNavbar - Navigation bar for project page
 * Features: Project menu, preview/code toggle, preview toolbar, user menu
 * Used in: Project page header
 */
"use client";

import { useRouter } from "next/navigation";
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/Dropdown";
import { PreviewToolbar } from "@/components/ui/PreviewToolbar";
import { ExpandableTabs } from "@/components/ui/ExpandableTabs";
import Logo from "@/components/ui/icon/logo";
import { VscPreview } from "react-icons/vsc";
import { FaEye } from "react-icons/fa";
import {
  Code,
  LogOut,
  LayoutDashboard,
  Edit3,
  Trash2,
  ChevronDown,
  Download,
  Settings,
  User,
} from "lucide-react";
import { motion } from "framer-motion";

interface ProjectNavbarProps {
  // Project data
  projectTitle: string;

  // UI state
  isFullscreenPreview: boolean;
  rightPanelMode: "preview" | "code";
  previewMode: "desktop" | "tablet" | "mobile";
  isDropdownOpen: boolean;

  // User data
  userName?: string;
  userEmail?: string;

  // Handlers
  onDropdownOpenChange: (open: boolean) => void;
  onToggleRightPanelMode: () => void;
  onSetPreviewMode: (mode: "desktop" | "tablet" | "mobile") => void;
  onToggleFullscreen: (fullscreen: boolean) => void;
  onReloadIframe: () => void;
  onRefreshPreview: () => void;
  onRenameProject: () => void;
  onExportProject: () => void;
  onDeleteProject: () => void;
  onSignOut: () => void;
  projectId: string;
}

export function ProjectNavbar({
  projectTitle,
  isFullscreenPreview,
  rightPanelMode,
  previewMode,
  isDropdownOpen,
  userName,
  userEmail,
  onDropdownOpenChange,
  onToggleRightPanelMode,
  onSetPreviewMode,
  onToggleFullscreen,
  onReloadIframe,
  onRefreshPreview,
  onRenameProject,
  onExportProject,
  onDeleteProject,
  onSignOut,
  projectId,
}: ProjectNavbarProps) {
  const router = useRouter();

  return (
    <header
      className={
        isFullscreenPreview
          ? "flex items-center justify-center px-4 py-3 border-b border-border bg-background/95 backdrop-blur relative z-50"
          : "grid grid-cols-3 gap-4 px-4 pt-3 pb-1  bg-background backdrop-blur relative z-50"
      }
    >
      {isFullscreenPreview ? (
        /* Fullscreen Preview Mode - Centered Controls */
        <PreviewToolbar
          onReloadIframe={onReloadIframe}
          onRefreshPreview={onRefreshPreview}
          previewMode={previewMode}
          onTogglePreviewMode={() =>
            onSetPreviewMode(previewMode === "desktop" ? "mobile" : "desktop")
          }
          onToggleFullscreen={() => onToggleFullscreen(false)}
          isFullscreen={true}
        />
      ) : (
        <>
          {/* Column 1 (1x): Logo, Project Name & Settings Dropdown */}
          <div className="flex items-center gap-3">
            <Dropdown
              trigger={
                <button
                  onClick={() => onDropdownOpenChange(!isDropdownOpen)}
                  className="flex items-center gap-2 rounded-lg transition-colors group"
                >
                  <Logo size={24} className="text-primary flex-shrink-0" />
                  <span className="font-semibold text-lg truncate max-w-[200px]">
                    {projectTitle}
                  </span>
                  <motion.div
                    animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                  >
                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                  </motion.div>
                </button>
              }
              onOpenChange={onDropdownOpenChange}
            >
              <DropdownItem onClick={() => router.push("/dashboard")}>
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem onClick={onRenameProject}>
                <Edit3 className="h-4 w-4" />
                Rename Project
              </DropdownItem>
              <DropdownItem
                onClick={() => router.push(`/project/${projectId}/settings`)}
              >
                <Settings className="h-4 w-4" />
                Settings
              </DropdownItem>
              <DropdownItem onClick={onExportProject}>
                <Download className="h-4 w-4" />
                Export Project
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem onClick={onDeleteProject} variant="destructive">
                <Trash2 className="h-4 w-4" />
                Delete Project
              </DropdownItem>
            </Dropdown>
          </div>

          {/* Column 2-3 (2x): Preview/Code Toggle, Controls & User Dropdown */}
          <div className="col-span-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Preview/Code Toggle */}
              <ExpandableTabs
                tabs={[
                  { title: "Preview", icon: FaEye },
                  { title: "Code", icon: Code },
                ]}
                selected={rightPanelMode === "preview" ? 0 : 1}
                onChange={(index) => {
                  if (index !== null) {
                    onToggleRightPanelMode();
                  }
                }}
                className="border-border"
              />
            </div>

            {rightPanelMode === "preview" && (
              <PreviewToolbar
                onReloadIframe={onReloadIframe}
                onRefreshPreview={onRefreshPreview}
                previewMode={previewMode}
                onTogglePreviewMode={() =>
                  onSetPreviewMode(
                    previewMode === "desktop" ? "mobile" : "desktop"
                  )
                }
                onToggleFullscreen={() => onToggleFullscreen(true)}
                isFullscreen={false}
              />
            )}

            {/* User Dropdown */}
            <Dropdown
              align="right"
              trigger={
                <button
                  className="flex items-center gap-2 bg-muted/60 hover:bg-muted/40  rounded-lg transition-colors"
                  title={userEmail}
                >
                  <span className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary text-white font-semibold text-lg">
                    {userName
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
              <DropdownItem onClick={() => router.push("/settings")}>
                <User className="h-4 w-4" />
                Account Settings
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem onClick={onSignOut}>
                <LogOut className="h-4 w-4" />
                Sign Out
              </DropdownItem>
            </Dropdown>
          </div>
        </>
      )}
    </header>
  );
}
