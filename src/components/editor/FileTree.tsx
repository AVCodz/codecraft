"use client";

import { useState, useRef, useCallback } from "react";
import { FileTreeNode } from "./FileTreeNode";
import { useProjectStore } from "@/lib/stores/projectStore";
import { useUIStore } from "@/lib/stores/uiStore";
import { Input } from "@/components/ui/Input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils/helpers";

interface FileTreeProps {
  className?: string;
}

export function FileTree({ className }: FileTreeProps) {
  const { files, createFile, selectedFile, selectFile } = useProjectStore();
  const { fileSearchQuery, setFileSearchQuery } = useUIStore();
  const [isCreating, setIsCreating] = useState<"file" | "folder" | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["/"])
  );
  const selectionInProgressRef = useRef(false);
  const lastSelectionTimeRef = useRef(0);

  // Filter files based on search query
  const filteredFiles = files.filter(
    (file) =>
      file.name.toLowerCase().includes(fileSearchQuery.toLowerCase()) ||
      file.path.toLowerCase().includes(fileSearchQuery.toLowerCase())
  );

  const _handleCreateItem = (type: "file" | "folder") => {
    setIsCreating(type);
    setNewItemName("");
  };

  const handleConfirmCreate = () => {
    if (!newItemName.trim() || !isCreating) return;

    const path = `/${newItemName.trim()}`;
    createFile(path, isCreating, isCreating === "file" ? "" : undefined);

    setIsCreating(null);
    setNewItemName("");
  };

  const handleCancelCreate = () => {
    setIsCreating(null);
    setNewItemName("");
  };

  const _handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConfirmCreate();
    } else if (e.key === "Escape") {
      handleCancelCreate();
    }
  };

  const toggleFolder = (path: string) => {
    console.log("[FileTree] 🔽 Toggling folder:", path);
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
      console.log("[FileTree] ➖ Collapsed:", path);
    } else {
      newExpanded.add(path);
      console.log("[FileTree] ➕ Expanded:", path);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFileSelect = useCallback(
    (path: string, type: "file" | "folder") => {
      // Prevent rapid selections (debounce with 50ms)
      const now = Date.now();
      if (
        selectionInProgressRef.current ||
        now - lastSelectionTimeRef.current < 50
      ) {
        console.log(`[FileTree] ⏸️ Ignoring rapid click: ${path}`);
        return;
      }

      selectionInProgressRef.current = true;
      lastSelectionTimeRef.current = now;

      const isNested = path.split("/").filter(Boolean).length > 1;
      console.log(
        `[FileTree] 📄 File selected: ${path} (type: ${type}, nested: ${isNested})`
      );

      if (type === "file") {
        // For nested files, we need to check recursively
        const findInTree = (
          nodes: typeof files,
          targetPath: string
        ): boolean => {
          for (const node of nodes) {
            if (node.path === targetPath && node.type === "file") {
              console.log(
                `[FileTree] ✅ Found file in tree: ${targetPath} (has content: ${!!node.content})`
              );
              return true;
            }
            if (node.children) {
              if (findInTree(node.children, targetPath)) {
                return true;
              }
            }
          }
          return false;
        };

        const fileExists = findInTree(files, path);

        if (!fileExists) {
          console.warn(
            `[FileTree] ⚠️ Selected file not found in tree: ${path}`
          );
          console.log(
            `[FileTree] 🔍 Searching in ${files.length} root nodes...`
          );
          // Still try to select it - the editor will handle the fallback
        }

        selectFile(path);
        console.log(`[FileTree] ✅ File selection completed: ${path}`);
      } else {
        console.log(`[FileTree] 📁 Folder selected (no action): ${path}`);
      }

      // Reset selection in progress flag after a short delay
      setTimeout(() => {
        selectionInProgressRef.current = false;
      }, 100);
    },
    [files, selectFile]
  );

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-background border-r border-border",
        className
      )}
    >
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold whitespace-nowrap">Files</h3>
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={fileSearchQuery}
              onChange={(e) => setFileSearchQuery(e.target.value)}
              className="h-7 text-xs pl-7"
            />
          </div>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto p-2 scrollbar-modern">
        {/* Files */}
        {filteredFiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-2">📁</div>
            <p className="text-sm">No files yet</p>
            <p className="text-xs text-muted-foreground">
              Ask AI to create files
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredFiles.map((file) => (
              <FileTreeNode
                key={file.id}
                file={file}
                isSelected={file.path === selectedFile}
                isExpanded={expandedFolders.has(file.path)}
                onToggle={() => toggleFolder(file.path)}
                onSelect={handleFileSelect}
                level={0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-border text-xs text-muted-foreground">
        {files.length} {files.length === 1 ? "item" : "items"}
      </div>
    </div>
  );
}
