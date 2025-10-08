"use client";

import { useState } from "react";
import { FileNode } from "@/lib/types";
import { useProjectStore } from "@/lib/stores/projectStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ChevronRight, ChevronDown, Edit2, Trash2 } from "lucide-react";
import { VscFile, VscJson, VscMarkdown, VscCode } from "react-icons/vsc";
import { FcFolder, FcOpenedFolder } from "react-icons/fc";
import {
  SiTypescript,
  SiJavascript,
  SiReact,
  SiHtml5,
  SiCss3,
  SiPython,
  SiGit,
  SiDocker,
  SiNpm,
  SiTailwindcss,
  SiPostcss,
  SiVite,
  SiEslint,
  SiPrettier,
} from "react-icons/si";
import { AiFillLock } from "react-icons/ai";
import { IoSettingsOutline } from "react-icons/io5";
import { BiSolidFileJson } from "react-icons/bi";
import { isEditableFile } from "@/lib/utils/fileSystem";
import { cn } from "@/lib/utils/helpers";

// File icon configuration with colors
interface IconConfig {
  icon: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
  color: string;
}

const getFileIconConfig = (
  path: string,
  type: "file" | "folder",
  isExpanded: boolean
): IconConfig => {
  const fileName = path.split("/").pop()?.toLowerCase() || "";
  const ext = path.split(".").pop()?.toLowerCase();

  // Folders - Use colored icons from react-icons/fc
  if (type === "folder") {
    return {
      icon: isExpanded ? FcOpenedFolder : FcFolder,
      color: "inherit", // Colored icon already has color
    };
  }

  // Special files by exact name
  if (fileName === "package.json") {
    return { icon: SiNpm, color: "#8bc34a" }; // Green
  }
  if (fileName === "package-lock.json") {
    return { icon: AiFillLock, color: "#8bc34a" }; // Green lock
  }
  if (fileName === "readme.md" || fileName === "readme") {
    return { icon: VscMarkdown, color: "#42a5f5" }; // Blue
  }
  if (fileName.startsWith(".env")) {
    return { icon: AiFillLock, color: "#fdd835" }; // Yellow lock
  }
  if (fileName === "dockerfile" || fileName === "docker-compose.yml") {
    return { icon: SiDocker, color: "#2496ed" };
  }
  if (fileName === ".gitignore") {
    return { icon: SiGit, color: "#f44336" }; // Red
  }

  // Vite config files
  if (fileName.includes("vite.config")) {
    return { icon: SiVite, color: "#ffc107" }; // Yellow/amber for Vite
  }

  // Tailwind config
  if (fileName.includes("tailwind.config")) {
    return { icon: SiTailwindcss, color: "#06b6d4" }; // Cyan
  }

  // PostCSS config
  if (fileName.includes("postcss.config")) {
    return { icon: SiPostcss, color: "#dd3a0a" }; // Orange-red
  }

  // ESLint config
  if (fileName.includes("eslint")) {
    return { icon: SiEslint, color: "#8b5cf6" }; // Purple
  }

  // Prettier config
  if (fileName.includes("prettier")) {
    return { icon: SiPrettier, color: "#56b3b4" }; // Teal
  }

  // TypeScript configs
  if (fileName.startsWith("tsconfig")) {
    return { icon: BiSolidFileJson, color: "#42a5f5" }; // Blue JSON
  }

  // By extension
  switch (ext) {
    // TypeScript/TSX
    case "ts":
      return { icon: SiTypescript, color: "#3178c6" }; // Blue
    case "tsx":
      return { icon: SiReact, color: "#61dafb" }; // Cyan

    // JavaScript/JSX
    case "js":
    case "mjs":
    case "cjs":
      return { icon: SiJavascript, color: "#f7df1e" }; // Yellow
    case "jsx":
      return { icon: SiReact, color: "#61dafb" }; // Cyan

    // Web
    case "html":
    case "htm":
      return { icon: SiHtml5, color: "#e34c26" }; // Orange
    case "css":
      return { icon: SiCss3, color: "#9c5cb8" }; // Purple (like in image)
    case "scss":
    case "sass":
      return { icon: SiCss3, color: "#cd6799" }; // Pink
    case "less":
      return { icon: SiCss3, color: "#2a4d80" }; // Dark blue

    // Data
    case "json":
      return { icon: BiSolidFileJson, color: "#42a5f5" }; // Blue

    // Documentation
    case "md":
    case "markdown":
      return { icon: VscMarkdown, color: "#42a5f5" }; // Blue

    // Images
    case "svg":
      return { icon: VscCode, color: "#ffc107" }; // Amber/yellow
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
      return { icon: VscFile, color: "#ab47bc" }; // Purple

    // Programming languages
    case "py":
      return { icon: SiPython, color: "#3776ab" };

    // Default
    default:
      return { icon: VscFile, color: "#6b7280" }; // Gray
  }
};

interface FileTreeNodeProps {
  file: FileNode;
  isSelected: string | boolean;
  isExpanded: boolean;
  onToggle: () => void;
  level: number;
}

export function FileTreeNode({
  file,
  isSelected,
  isExpanded,
  onToggle,
  level,
}: FileTreeNodeProps) {
  const { selectFile, deleteFile, renameFile } = useProjectStore();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(file.name);
  const [showActions, setShowActions] = useState(false);

  const handleClick = () => {
    if (file.type === "folder") {
      onToggle();
    } else if (isEditableFile(file.path)) {
      selectFile(file.path);
    }
  };

  const handleRename = () => {
    if (!newName.trim() || newName === file.name) {
      setIsRenaming(false);
      setNewName(file.name);
      return;
    }

    const newPath = file.path.replace(file.name, newName.trim());
    renameFile(file.path, newPath);
    setIsRenaming(false);
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${file.name}?`)) {
      deleteFile(file.path);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRename();
    } else if (e.key === "Escape") {
      setIsRenaming(false);
      setNewName(file.name);
    }
  };

  const paddingLeft = level * 12 + 8;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 py-1 px-2 rounded text-sm cursor-pointer hover:bg-accent/50 transition-colors",
          (typeof isSelected === "string"
            ? file.path === isSelected
            : isSelected) && "bg-accent text-accent-foreground",
          !isEditableFile(file.path) && file.type === "file" && "opacity-60"
        )}
        style={{ paddingLeft }}
        onClick={handleClick}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Expand/Collapse Icon */}
        {file.type === "folder" && (
          <Button
            size="icon"
            variant="ghost"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        )}

        {/* File Icon */}
        {(() => {
          const { icon: IconComponent, color } = getFileIconConfig(
            file.path,
            file.type,
            isExpanded
          );

          return (
            <IconComponent
              className="h-3.5 w-3.5 flex-shrink-0"
              style={{ color }}
            />
          );
        })()}

        {/* File Name */}
        <div className="flex-1 min-w-0">
          <span className="truncate block">{file.name}</span>
        </div>

        {/* Read-only indicator - no edit/delete actions */}
      </div>

      {/* Children */}
      {file.type === "folder" && isExpanded && file.children && (
        <div>
          {file.children.map((child) => (
            <FileTreeNodeWithExpanded
              key={child.id}
              file={child}
              isSelected={
                typeof isSelected === "string"
                  ? child.path === isSelected
                  : false
              }
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Wrapper component to connect child nodes to the parent's expanded state
function FileTreeNodeWithExpanded({
  file,
  isSelected,
  level,
}: {
  file: FileNode;
  isSelected: boolean;
  level: number;
}) {
  const { selectFile } = useProjectStore();
  // This would need to come from a shared context or parent state
  // For now, we'll use local state which isn't ideal but works
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    console.log("[FileTreeNode] Toggle:", file.path, !isExpanded);
    setIsExpanded(!isExpanded);
  };

  return (
    <FileTreeNode
      file={file}
      isSelected={isSelected}
      isExpanded={isExpanded}
      onToggle={handleToggle}
      level={level}
    />
  );
}
