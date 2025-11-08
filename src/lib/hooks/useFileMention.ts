import { useState, useEffect, useMemo, RefObject, useCallback } from "react";
import { FileNode, ProjectFile } from "@/lib/types";
import toast from "react-hot-toast";

export interface MentionedFile {
  path: string;
  type: "file" | "folder";
  name: string;
}

interface UseFileMentionReturn {
  showDropdown: boolean;
  setShowDropdown: (show: boolean) => void;
  searchQuery: string;
  filteredFiles: FileNode[];
  filteredFolders: FileNode[];
  dropdownPosition: { top: number; left: number };
  selectedIndex: number;
  mentionedFiles: MentionedFile[];
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleSelect: (path: string, type: "file" | "folder") => void;
  removeMention: (path: string) => void;
  clearMentions: () => void;
}

const flattenFileTree = (nodes: FileNode[], parentPath = ""): FileNode[] => {
  let result: FileNode[] = [];

  for (const node of nodes) {
    const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name;
    result.push({ ...node, path: fullPath });

    if (node.type === "folder" && node.children) {
      result = result.concat(flattenFileTree(node.children, fullPath));
    }
  }

  return result;
};

const filterByQuery = (items: FileNode[], query: string): FileNode[] => {
  if (!query) return items;

  const lowerQuery = query.toLowerCase();

  return items
    .filter((item) => {
      const pathMatch = item.path.toLowerCase().includes(lowerQuery);
      const nameMatch = item.name.toLowerCase().includes(lowerQuery);
      return pathMatch || nameMatch;
    })
    .sort((a, b) => {
      const aExact = a.name.toLowerCase().startsWith(lowerQuery);
      const bExact = b.name.toLowerCase().startsWith(lowerQuery);

      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      return a.name.localeCompare(b.name);
    });
};

export const useFileMention = (
  value: string,
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  projectFiles: ProjectFile[],
  fileTree: FileNode[],
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
): UseFileMentionReturn => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionedFiles, setMentionedFiles] = useState<MentionedFile[]>([]);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [triggerPosition, setTriggerPosition] = useState(-1);
  const [manuallyDismissed, setManuallyDismissed] = useState(false);
  const [lastAtPosition, setLastAtPosition] = useState(-1);

  const allFiles = useMemo(() => {
    return projectFiles.map((file) => ({
      id: file.$id,
      name: file.name,
      path: file.path,
      type: "file" as const,
    }));
  }, [projectFiles]);

  const allFolders = useMemo(() => {
    return flattenFileTree(fileTree).filter((node) => node.type === "folder");
  }, [fileTree]);

  const filteredFiles = useMemo(() => {
    return filterByQuery(allFiles, searchQuery);
  }, [allFiles, searchQuery]);

  const filteredFolders = useMemo(() => {
    return filterByQuery(allFolders, searchQuery);
  }, [allFolders, searchQuery]);

  const totalItems = filteredFiles.length + filteredFolders.length;

  useEffect(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);

    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);

    const shouldShowDropdown =
      lastAtIndex !== -1 &&
      (lastAtIndex === 0 ||
        value[lastAtIndex - 1] === " " ||
        value[lastAtIndex - 1] === "\n") &&
      !textAfterAt.includes(" ") &&
      !textAfterAt.includes("\n");

    // Check if this is a new @ trigger (different position than before)
    const isNewAtTrigger = lastAtIndex !== lastAtPosition;

    if (shouldShowDropdown) {
      // Only show dropdown if it's a new @ trigger or if it wasn't manually dismissed
      if (isNewAtTrigger || !manuallyDismissed) {
        setShowDropdown(true);
        setSearchQuery(textAfterAt);
        setTriggerPosition(lastAtIndex);
        setSelectedIndex(0);
        setLastAtPosition(lastAtIndex);

        // Reset manual dismissal flag when showing dropdown for new @ trigger
        if (isNewAtTrigger) {
          setManuallyDismissed(false);
        }

        setDropdownPosition({
          top: 0,
          left: 0,
        });
      }
    } else if (showDropdown) {
      setShowDropdown(false);
      setSearchQuery("");
      setTriggerPosition(-1);
      setLastAtPosition(-1);
      setManuallyDismissed(false);
    }
  }, [value, textareaRef, showDropdown, manuallyDismissed, lastAtPosition]);

  const handleSelect = useCallback(
    (path: string, type: "file" | "folder") => {
      if (!textareaRef.current) return;

      const alreadyMentioned = mentionedFiles.some((f) => f.path === path);
      if (alreadyMentioned) {
        const fileName = path.split("/").pop() || path;
        toast.error(`"${fileName}" is already mentioned`, {
          duration: 2500,
          icon: "⚠️",
        });
        setShowDropdown(false);
        return;
      }

      const name = path.split("/").pop() || path;
      setMentionedFiles((prev) => [...prev, { path, type, name }]);

      const beforeTrigger = value.substring(0, triggerPosition);
      const afterCursor = value.substring(textareaRef.current.selectionStart);
      const newValue = beforeTrigger + path + " " + afterCursor;

      textareaRef.current.value = newValue;

      const syntheticEvent = {
        target: textareaRef.current,
        currentTarget: textareaRef.current,
      } as React.ChangeEvent<HTMLTextAreaElement>;

      onChange(syntheticEvent);

      const newCursorPosition = triggerPosition + path.length + 1;
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(
            newCursorPosition,
            newCursorPosition
          );
          textareaRef.current.focus();
        }
      }, 0);

      setShowDropdown(false);
      setSearchQuery("");
    },
    [mentionedFiles, triggerPosition, value, textareaRef, onChange]
  );

  const removeMention = useCallback((path: string) => {
    setMentionedFiles((prev) => prev.filter((f) => f.path !== path));
  }, []);

  const clearMentions = useCallback(() => {
    setMentionedFiles([]);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showDropdown) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, totalItems - 1));
          break;

        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;

        case "Enter":
          if (showDropdown) {
            e.preventDefault();
            if (selectedIndex < filteredFiles.length) {
              const selectedFile = filteredFiles[selectedIndex];
              handleSelect(selectedFile.path, "file");
            } else {
              const folderIndex = selectedIndex - filteredFiles.length;
              const selectedFolder = filteredFolders[folderIndex];
              if (selectedFolder) {
                handleSelect(selectedFolder.path, "folder");
              }
            }
          }
          break;

        case "Escape":
          e.preventDefault();
          setShowDropdown(false);
          setSearchQuery("");
          setManuallyDismissed(true);
          break;
      }
    },
    [
      showDropdown,
      selectedIndex,
      totalItems,
      filteredFiles,
      filteredFolders,
      handleSelect,
    ]
  );

  return {
    showDropdown,
    setShowDropdown,
    searchQuery,
    filteredFiles,
    filteredFolders,
    dropdownPosition,
    selectedIndex,
    mentionedFiles,
    handleKeyDown,
    handleSelect,
    removeMention,
    clearMentions,
  };
};
