/**
 * FileTree - Project file/folder tree navigation component
 * Displays hierarchical file structure with tabs for Files and Search
 * Features: Tab navigation, file search with content matching, expand/collapse
 * Used in: Project page code mode sidebar for file navigation
 */
"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { FileTreeNode } from "./FileTreeNode";
import { useProjectStore } from "@/lib/stores/projectStore";
import { Input } from "@/components/ui/Input";
import { Search, ChevronRight, FileText } from "lucide-react";
import { cn } from "@/lib/utils/helpers";
import type { FileNode } from "@/lib/types";
import { VscFile, VscMarkdown, VscCode } from "react-icons/vsc";
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
import { BiSolidFileJson } from "react-icons/bi";

interface FileTreeProps {
  className?: string;
}

type TabType = "files" | "search";

interface LineMatch {
  lineNumber: number;
  lineContent: string;
  matchIndex: number;
}

interface SearchResult {
  file: FileNode;
  matchCount: number;
  matchType: "filename" | "content";
  lineMatches?: LineMatch[];
}

// Get file icon configuration
const getFileIconConfig = (
  path: string
): {
  icon: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
  color: string;
} => {
  const fileName = path.split("/").pop()?.toLowerCase() || "";
  const ext = path.split(".").pop()?.toLowerCase();

  // Special files by exact name
  if (fileName === "package.json") return { icon: SiNpm, color: "#8bc34a" };
  if (fileName === "package-lock.json")
    return { icon: AiFillLock, color: "#8bc34a" };
  if (fileName === "readme.md" || fileName === "readme")
    return { icon: VscMarkdown, color: "#42a5f5" };
  if (fileName.startsWith(".env"))
    return { icon: AiFillLock, color: "#fdd835" };
  if (fileName === "dockerfile" || fileName === "docker-compose.yml")
    return { icon: SiDocker, color: "#2496ed" };
  if (fileName === ".gitignore") return { icon: SiGit, color: "#f44336" };
  if (fileName.includes("vite.config"))
    return { icon: SiVite, color: "#ffc107" };
  if (fileName.includes("tailwind.config"))
    return { icon: SiTailwindcss, color: "#06b6d4" };
  if (fileName.includes("postcss.config"))
    return { icon: SiPostcss, color: "#dd3a0a" };
  if (fileName.includes("eslint")) return { icon: SiEslint, color: "#8b5cf6" };
  if (fileName.includes("prettier"))
    return { icon: SiPrettier, color: "#56b3b4" };
  if (fileName.startsWith("tsconfig"))
    return { icon: BiSolidFileJson, color: "#42a5f5" };

  // By extension
  switch (ext) {
    case "ts":
      return { icon: SiTypescript, color: "#3178c6" };
    case "tsx":
      return { icon: SiReact, color: "#61dafb" };
    case "js":
    case "mjs":
    case "cjs":
      return { icon: SiJavascript, color: "#f7df1e" };
    case "jsx":
      return { icon: SiReact, color: "#61dafb" };
    case "html":
    case "htm":
      return { icon: SiHtml5, color: "#e34c26" };
    case "css":
      return { icon: SiCss3, color: "#9c5cb8" };
    case "scss":
    case "sass":
      return { icon: SiCss3, color: "#cd6799" };
    case "less":
      return { icon: SiCss3, color: "#2a4d80" };
    case "json":
      return { icon: BiSolidFileJson, color: "#42a5f5" };
    case "md":
    case "markdown":
      return { icon: VscMarkdown, color: "#42a5f5" };
    case "svg":
      return { icon: VscCode, color: "#ffc107" };
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
      return { icon: VscFile, color: "#ab47bc" };
    case "py":
      return { icon: SiPython, color: "#3776ab" };
    default:
      return { icon: VscFile, color: "#6b7280" };
  }
};

export function FileTree({ className }: FileTreeProps) {
  const { files, selectedFile, selectFile } = useProjectStore();
  const [activeTab, setActiveTab] = useState<TabType>("files");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["/"])
  );
  const [expandedSearchResults, setExpandedSearchResults] = useState<
    Set<string>
  >(new Set());
  const selectionInProgressRef = useRef(false);
  const lastSelectionTimeRef = useRef(0);

  // Search through all files (filename and content)
  const searchResults = useMemo<SearchResult[]>(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const results: SearchResult[] = [];

    const searchInFiles = (fileNodes: FileNode[]) => {
      for (const file of fileNodes) {
        if (file.type === "file") {
          const filenameMatches = file.name.toLowerCase().includes(query);

          if (filenameMatches) {
            results.push({
              file,
              matchCount: 0,
              matchType: "filename",
            });
          } else if (file.content) {
            // Search for matches in content and find line numbers
            const lines = file.content.split("\n");
            const lineMatches: LineMatch[] = [];

            lines.forEach((line, index) => {
              const lowerLine = line.toLowerCase();
              const regex = new RegExp(escapedQuery, "g");
              let match;

              while ((match = regex.exec(lowerLine)) !== null) {
                lineMatches.push({
                  lineNumber: index + 1,
                  lineContent: line.trim().slice(0, 100), // Limit preview length
                  matchIndex: match.index,
                });
              }
            });

            if (lineMatches.length > 0) {
              results.push({
                file,
                matchCount: lineMatches.length,
                matchType: "content",
                lineMatches,
              });
            }
          }
        }

        if (file.children) {
          searchInFiles(file.children);
        }
      }
    };

    searchInFiles(files);
    return results;
  }, [searchQuery, files]);

  const totalMatches = searchResults.reduce(
    (sum, result) =>
      sum + (result.matchType === "content" ? result.matchCount : 1),
    0
  );

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const toggleSearchResult = (path: string) => {
    const newExpanded = new Set(expandedSearchResults);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedSearchResults(newExpanded);
  };

  const handleFileSelect = useCallback(
    (path: string, type: "file" | "folder") => {
      const now = Date.now();
      if (
        selectionInProgressRef.current ||
        now - lastSelectionTimeRef.current < 50
      ) {
        return;
      }

      selectionInProgressRef.current = true;
      lastSelectionTimeRef.current = now;

      if (type === "file") {
        selectFile(path);
      }

      setTimeout(() => {
        selectionInProgressRef.current = false;
      }, 100);
    },
    [selectFile]
  );

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-background border-r border-border",
        className
      )}
    >
      {/* Tab Header */}
      <div className="border-b border-border">
        <div className="flex">
          <button
            onClick={() => setActiveTab("files")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative",
              activeTab === "files"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText className="h-4 w-4" />
            Files
            {activeTab === "files" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("search")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative",
              activeTab === "search"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Search className="h-4 w-4" />
            Search
            {activeTab === "search" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === "files" ? (
          /* Files Tab */
          <>
            <div className="flex-1 overflow-y-auto p-2 scrollbar-modern">
              {files.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="text-4xl mb-2">📁</div>
                  <p className="text-sm">No files yet</p>
                  <p className="text-xs text-muted-foreground">
                    Ask AI to create files
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {files.map((file) => (
                    <FileTreeNode
                      key={file.id}
                      file={file}
                      isSelected={selectedFile || ""}
                      isExpanded={expandedFolders.has(file.path)}
                      onToggle={() => toggleFolder(file.path)}
                      onSelect={handleFileSelect}
                      level={0}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="p-2 border-t border-border text-xs text-muted-foreground">
              {files.length} {files.length === 1 ? "item" : "items"}
            </div>
          </>
        ) : (
          /* Search Tab */
          <>
            <div className="p-3 border-b border-border">
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 text-sm"
                autoFocus
              />
            </div>

            {searchQuery.trim() && (
              <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border">
                {totalMatches} result{totalMatches !== 1 ? "s" : ""} in{" "}
                {searchResults.length} file
                {searchResults.length !== 1 ? "s" : ""}
              </div>
            )}

            <div className="flex-1 overflow-y-auto scrollbar-modern">
              {!searchQuery.trim() ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Search for files</p>
                  <p className="text-xs mt-1">Find files by name or content</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No results found</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </div>
              ) : (
                <div className="py-2">
                  {searchResults.map((result) => (
                    <div key={result.file.path}>
                      <button
                        onClick={() => {
                          if (result.matchType === "filename") {
                            handleFileSelect(result.file.path, "file");
                          } else {
                            toggleSearchResult(result.file.path);
                          }
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/50 transition-colors text-left",
                          result.file.path === selectedFile &&
                            "bg-primary/10 text-primary "
                        )}
                      >
                        {result.matchType === "content" && (
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 flex-shrink-0 transition-transform",
                              expandedSearchResults.has(result.file.path) &&
                                "rotate-90"
                            )}
                          />
                        )}
                        {(() => {
                          const { icon: IconComponent, color } =
                            getFileIconConfig(result.file.path);
                          return (
                            <IconComponent
                              className="h-4 w-4 flex-shrink-0"
                              style={{ color }}
                            />
                          );
                        })()}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">
                            {result.file.path}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground flex-shrink-0">
                          {result.matchType === "filename" ? (
                            <span>filename</span>
                          ) : (
                            <span>{result.matchCount}</span>
                          )}
                        </div>
                      </button>

                      {/* Show line matches for content matches */}
                      {result.matchType === "content" &&
                        expandedSearchResults.has(result.file.path) &&
                        result.lineMatches && (
                          <div className="bg-accent/10  border-primary/30">
                            {result.lineMatches.map((lineMatch, idx) => {
                              const content = lineMatch.lineContent;
                              const matchStart = content
                                .toLowerCase()
                                .indexOf(searchQuery.toLowerCase());
                              const matchEnd = matchStart + searchQuery.length;

                              return (
                                <button
                                  key={idx}
                                  onClick={() =>
                                    handleFileSelect(result.file.path, "file")
                                  }
                                  className="w-full text-left px-3 py-1.5 hover:bg-accent/30 transition-colors flex items-start gap-3 text-xs"
                                >
                                  <span className="text-muted-foreground font-mono flex-shrink-0 w-10 text-right">
                                    {lineMatch.lineNumber}
                                  </span>
                                  <span className="text-muted-foreground flex-1 truncate font-mono">
                                    {matchStart >= 0 ? (
                                      <>
                                        {content.slice(0, matchStart)}
                                        <span className="bg-yellow-500/30 text-yellow-200">
                                          {content.slice(matchStart, matchEnd)}
                                        </span>
                                        {content.slice(matchEnd)}
                                      </>
                                    ) : (
                                      content
                                    )}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
