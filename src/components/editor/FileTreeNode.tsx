"use client";

import { useState } from "react";
import { FileNode } from "@/lib/types";
import { useProjectStore } from "@/lib/stores/projectStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ChevronRight, ChevronDown, Edit2, Trash2 } from "lucide-react";
import { getFileIcon, isEditableFile } from "@/lib/utils/fileSystem";
import { cn } from "@/lib/utils/helpers";

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
        <span className="text-sm flex-shrink-0">
          {getFileIcon(file.path, file.type)}
        </span>

        {/* File Name */}
        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleRename}
              className="h-5 text-xs py-0 px-1"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="truncate block">{file.name}</span>
          )}
        </div>

        {/* Actions */}
        {showActions && !isRenaming && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="ghost"
              className="h-4 w-4 p-0"
              onClick={(e) => {
                e.stopPropagation();
                setIsRenaming(true);
              }}
              title="Rename"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-4 w-4 p-0 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Children */}
      {file.type === "folder" && isExpanded && file.children && (
        <div>
          {file.children.map((child) => (
            <FileTreeNode
              key={child.id}
              file={child}
              isSelected={
                typeof isSelected === "string"
                  ? child.path === isSelected
                  : false
              }
              isExpanded={false} // You'd need to track this per child
              onToggle={() => {}} // Handle child toggle
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
