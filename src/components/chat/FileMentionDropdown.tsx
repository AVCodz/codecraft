import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { FileNode } from "@/lib/types";
import { VscFile } from "react-icons/vsc";
import { FcFolder } from "react-icons/fc";
import {
  SiTypescript,
  SiJavascript,
  SiReact,
  SiHtml5,
  SiCss3,
  SiPython,
} from "react-icons/si";
import { BiSolidFileJson } from "react-icons/bi";
import { cn } from "@/lib/utils/helpers";
import { motion, AnimatePresence } from "framer-motion";

interface FileMentionDropdownProps {
  files: FileNode[];
  folders: FileNode[];
  onSelect: (path: string, type: "file" | "folder") => void;
  onClose: () => void;
  position: { top: number; left: number };
  selectedIndex: number;
}

const getFileIcon = (path: string, type: "file" | "folder") => {
  if (type === "folder") {
    return { icon: FcFolder, color: "inherit" };
  }

  const ext = path.split(".").pop()?.toLowerCase();

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
    case "json":
      return { icon: BiSolidFileJson, color: "#42a5f5" };
    case "py":
      return { icon: SiPython, color: "#3776ab" };
    default:
      return { icon: VscFile, color: "#6b7280" };
  }
};

export function FileMentionDropdown({
  files,
  folders,
  onSelect,
  selectedIndex,
}: FileMentionDropdownProps) {
  const [filesExpanded, setFilesExpanded] = useState(true);
  const [foldersExpanded, setFoldersExpanded] = useState(true);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  const totalItems = files.length + folders.length;

  // Auto-scroll selected item into view when navigating with keyboard
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedIndex]);

  if (totalItems === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="w-full bg-background border border-border rounded-lg shadow-lg p-3"
      >
        <p className="text-sm text-muted-foreground">No files found</p>
      </motion.div>
    );
  }

  let currentIndex = 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="w-full bg-background border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto scrollbar-none"
    >
      {files.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setFilesExpanded(!filesExpanded)}
            className="flex items-center justify-between gap-2 w-full px-3 py-2 text-sm font-medium hover:bg-accent/50 transition-colors"
          >
            <span> Files ({files.length})</span>

            <motion.div
              animate={{ rotate: filesExpanded ? 0 : -90 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <ChevronDown className="h-4 w-4" />
            </motion.div>
          </button>

          <AnimatePresence>
            {filesExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="border-t border-border overflow-hidden"
              >
                {files.map((file) => {
                  const itemIndex = currentIndex++;
                  const { icon: IconComponent, color } = getFileIcon(
                    file.path,
                    "file"
                  );
                  const isSelected = itemIndex === selectedIndex;
                  const parentPath = file.path
                    .split("/")
                    .slice(0, -1)
                    .join("/");

                  return (
                    <button
                      key={file.path}
                      ref={isSelected ? selectedItemRef : null}
                      type="button"
                      onClick={() => onSelect(file.path, "file")}
                      className={cn(
                        "flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-accent/50 transition-colors",
                        isSelected && "bg-primary/20"
                      )}
                    >
                      <IconComponent
                        className="h-4 w-4 flex-shrink-0"
                        style={{ color }}
                      />
                      <div className="flex-1 flex justify-between min-w-0 text-left">
                        <div className="truncate">{file.name}</div>
                        {parentPath && (
                          <div className="text-xs text-muted-foreground truncate">
                            {parentPath}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {folders.length > 0 && (
        <div className={files.length > 0 ? "border-t border-border" : ""}>
          <button
            type="button"
            onClick={() => setFoldersExpanded(!foldersExpanded)}
            className="flex justify-between items-center gap-2 w-full px-3 py-2 text-sm font-medium hover:bg-accent/50 transition-colors"
          >
            <span>Folders ({folders.length})</span>

            <motion.div
              animate={{ rotate: foldersExpanded ? 0 : -90 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <ChevronDown className="h-4 w-4" />
            </motion.div>
          </button>

          <AnimatePresence>
            {foldersExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="border-t border-border overflow-hidden"
              >
                {folders.map((folder) => {
                  const itemIndex = currentIndex++;
                  const { icon: IconComponent, color } = getFileIcon(
                    folder.path,
                    "folder"
                  );
                  const isSelected = itemIndex === selectedIndex;

                  return (
                    <button
                      key={folder.path}
                      ref={isSelected ? selectedItemRef : null}
                      type="button"
                      onClick={() => onSelect(folder.path, "folder")}
                      className={cn(
                        "flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-accent/50 transition-colors",
                        isSelected && "bg-primary/20"
                      )}
                    >
                      <IconComponent
                        className="h-4 w-4 flex-shrink-0"
                        style={{ color }}
                      />
                      <div className="flex-1 flex justify-between min-w-0 text-left">
                        <div className="truncate">{folder.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {folder.path}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
