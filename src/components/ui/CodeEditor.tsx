/**
 * CodeEditor - Monaco-based code editor with syntax highlighting
 * Full-featured code editor with theme support, auto-save, and file management
 * Features: Monaco editor, custom themes, debounced saves, empty state handling
 * Used in: Project page code mode for viewing and editing project files
 */
"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { useProjectStore } from "@/lib/stores/projectStore";
import { useFilesStore } from "@/lib/stores/filesStore";
import { useUIStore } from "@/lib/stores/uiStore";
import { getLanguageFromPath, findFileNode } from "@/lib/utils/fileSystem";
import { debounce } from "@/lib/utils/helpers";
import { initializeMonaco } from "@/lib/monaco/setup";
import { initializeTypeDefinitions } from "@/lib/monaco/typeDefinitions";
import { debugFileContent } from "@/lib/utils/fileDebug";
import {
  ensureFileContentInUI,
  syncLocalDBToUI,
} from "@/lib/utils/localDBSync";
import { FileText, Folder, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/helpers";

// Initialize Monaco once globally (async)
if (typeof window !== "undefined") {
  let monacoInitialized = false;
  if (!monacoInitialized) {
    monacoInitialized = true;
    initializeMonaco().then(() => {
      initializeTypeDefinitions();
    });
  }
}

interface CodeEditorProps {
  className?: string;
}

export function CodeEditor({ className }: CodeEditorProps) {
  const editorRef = useRef<unknown>(null);
  const selectionVersionRef = useRef(0);
  const [loadedFile, setLoadedFile] = useState<{
    path: string;
    version: number;
  } | null>(null);

  const {
    files,
    selectedFile,
    currentProject,
    updateFileContent,
    markFileAsUnsaved,
    markFileAsSaved,
  } = useProjectStore();
  const { getFiles } = useFilesStore();
  const { theme, fontSize, tabSize, wordWrap, minimap } = useUIStore();

  // Track selection changes and increment version to handle race conditions
  useEffect(() => {
    if (selectedFile) {
      selectionVersionRef.current += 1;
      const currentVersion = selectionVersionRef.current;
      console.log(
        `[CodeEditor] 📌 File selected: ${selectedFile} (v${currentVersion})`
      );

      // Update loaded file state with the new version
      setLoadedFile({ path: selectedFile, version: currentVersion });
    } else {
      setLoadedFile(null);
    }
  }, [selectedFile]);

  // Enhanced file content loading with fallback using useMemo for proper memoization
  const currentFile = useMemo(() => {
    if (!selectedFile || !loadedFile || loadedFile.path !== selectedFile) {
      return undefined;
    }

    const fileVersion = loadedFile.version;

    // Check if this is a nested file (has multiple path segments)
    const isNestedFile = selectedFile.split("/").filter(Boolean).length > 1;
    const debugMode = false; // Disabled for performance, enable if needed

    console.log(
      `[CodeEditor] 🔍 Loading file: ${selectedFile} (v${fileVersion}, nested: ${isNestedFile})`
    );

    // First try to get from project store (file tree)
    let fileNode = findFileNode(files, selectedFile, debugMode);

    if (!fileNode && currentProject) {
      console.warn(
        `[CodeEditor] ❌ File not found in tree: ${selectedFile}, checking filesStore directly`
      );
      // File not in tree at all - try to get from files store
      const rawFiles = getFiles(currentProject.$id);
      const rawFile = rawFiles.find((f) => f.path === selectedFile);

      if (rawFile) {
        // Verify this is still the latest selection
        if (selectionVersionRef.current !== fileVersion) {
          console.log(
            `[CodeEditor] ⏭️ Skipping outdated file load: ${selectedFile} (v${fileVersion})`
          );
          return undefined;
        }

        console.log(
          `[CodeEditor] ✅ Found file in filesStore but not in tree: ${selectedFile}`
        );
        // Create a temporary node from the raw file
        fileNode = {
          id: rawFile.$id,
          path: rawFile.path,
          name: rawFile.name,
          type: rawFile.type,
          content: rawFile.content,
          language: rawFile.language,
          size: rawFile.size,
        };
      }
    }

    // If no content in project store, try to get from files store
    if (fileNode && !fileNode.content && currentProject) {
      console.log(
        `[CodeEditor] 🔍 File found but no content in tree, checking filesStore for: ${selectedFile}`
      );
      const rawFiles = getFiles(currentProject.$id);
      const rawFile = rawFiles.find((f) => f.path === selectedFile);

      if (rawFile && rawFile.content) {
        // Verify this is still the latest selection
        if (selectionVersionRef.current !== fileVersion) {
          console.log(
            `[CodeEditor] ⏭️ Skipping outdated content merge: ${selectedFile} (v${fileVersion})`
          );
          return undefined;
        }

        console.log(
          `[CodeEditor] ✅ Found content in filesStore for: ${selectedFile} (${rawFile.content.length} chars)`
        );
        // Merge content from raw file into the file node
        fileNode = { ...fileNode, content: rawFile.content };
      } else {
        console.warn(
          `[CodeEditor] ⚠️ No content found in either store for: ${selectedFile}`
        );
        // Try to ensure file content is available from LocalDB
        if (currentProject) {
          const contentFound = ensureFileContentInUI(
            currentProject.$id,
            selectedFile
          );
          if (!contentFound) {
            // Last resort: debug the issue
            debugFileContent(currentProject.$id, selectedFile);
            // Try a full LocalDB sync
            syncLocalDBToUI(currentProject.$id);
          }
        }
      }
    }

    // Final version check before returning
    if (selectionVersionRef.current !== fileVersion) {
      console.log(
        `[CodeEditor] ⏭️ Skipping outdated file display: ${selectedFile} (v${fileVersion})`
      );
      return undefined;
    }

    if (fileNode) {
      console.log(
        `[CodeEditor] 📄 Displaying file: ${selectedFile} (v${fileVersion}, ${
          fileNode.content?.length || 0
        } chars)`
      );
    } else if (selectedFile) {
      console.warn(`[CodeEditor] ❌ File not found anywhere: ${selectedFile}`);
    }

    return fileNode;
  }, [selectedFile, loadedFile, files, currentProject, getFiles]);

  // Debug selected file changes
  useEffect(() => {
    if (selectedFile && currentProject) {
      console.log(`[CodeEditor] 🔄 Selected file changed: ${selectedFile}`);
      if (!currentFile) {
        console.warn(
          `[CodeEditor] ❌ Selected file not found: ${selectedFile}`
        );
        debugFileContent(currentProject.$id, selectedFile);
      }
    }
  }, [selectedFile, currentProject, currentFile]);

  // Debounced save function
  const debouncedSave = debounce((path, _content) => {
    // Here you would typically save to the backend
    markFileAsSaved(path as string);
  }, 1000);

  const handleEditorChange = (value: string | undefined) => {
    if (!currentFile || value === undefined) return;

    updateFileContent(currentFile.path, value);
    markFileAsUnsaved(currentFile.path);
    debouncedSave(currentFile.path, value);
  };

  const handleEditorDidMount = (editor: unknown, monaco: unknown) => {
    editorRef.current = editor;

    // Configure Brilliance Black theme
    (monaco as any).editor.defineTheme("brilliance-black", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "7C7C7C", fontStyle: "italic" },
        { token: "comment.line", foreground: "7C7C7C", fontStyle: "italic" },
        { token: "comment.block", foreground: "7C7C7C", fontStyle: "italic" },
        { token: "string", foreground: "CE9178" },
        { token: "string.quoted", foreground: "CE9178" },
        { token: "constant.numeric", foreground: "B5CEA8" },
        { token: "constant.language", foreground: "569CD6" },
        { token: "constant.character", foreground: "CE9178" },
        { token: "keyword", foreground: "569CD6" },
        { token: "keyword.control", foreground: "569CD6" },
        { token: "keyword.operator", foreground: "D4D4D4" },
        { token: "storage", foreground: "569CD6" },
        { token: "storage.type", foreground: "569CD6" },
        { token: "entity.name.function", foreground: "DCDCAA" },
        { token: "entity.name.type", foreground: "4EC9B0" },
        { token: "entity.name.class", foreground: "4EC9B0" },
        { token: "entity.name.tag", foreground: "569CD6" },
        { token: "support.function", foreground: "DCDCAA" },
        { token: "support.class", foreground: "4EC9B0" },
        { token: "support.type", foreground: "4EC9B0" },
        { token: "variable", foreground: "9CDCFE" },
        { token: "variable.parameter", foreground: "9CDCFE" },
        { token: "variable.language", foreground: "569CD6" },
        { token: "invalid", foreground: "F44747" },
        {
          token: "invalid.deprecated",
          foreground: "D4D4D4",
          background: "F44747",
        },
        // JSX/TSX specific tokens
        { token: "tag.tsx", foreground: "569CD6" },
        { token: "tag.ts", foreground: "569CD6" },
        { token: "delimiter.tsx", foreground: "808080" },
        { token: "delimiter.ts", foreground: "808080" },
        { token: "type.identifier.tsx", foreground: "4EC9B0" },
        { token: "type.identifier.ts", foreground: "4EC9B0" },
        { token: "identifier.tsx", foreground: "9CDCFE" },
        { token: "identifier.ts", foreground: "9CDCFE" },
      ],
      colors: {
        "editor.background": "#000000",
        "editor.foreground": "#D4D4D4",
        "editorGutter.background": "#141313",
        "editorLineNumber.foreground": "#858585",
        "editorLineNumber.activeForeground": "#C6C6C6",
        "editorLineNumber.activeBackground": "#302C2C",
        "editor.selectionBackground": "#264F78",
        "editor.inactiveSelectionBackground": "#3A3D41",
        "editor.lineHighlightBackground": "#302C2C",
        "editor.lineHighlightBorder": "#00000000",
        "editorCursor.foreground": "#AEAFAD",
        "editorWhitespace.foreground": "#404040",
        "editorIndentGuide.background": "#404040",
        "editorIndentGuide.activeBackground": "#707070",
        "editor.findMatchBackground": "#515C6A",
        "editor.findMatchHighlightBackground": "#515C6A80",
        "editorBracketMatch.background": "#0064001A",
        "editorBracketMatch.border": "#888888",
      },
    });

    // Set Brilliance Black theme
    (monaco as any).editor.setTheme("brilliance-black");

    // Configure TypeScript/JSX language features
    (
      monaco as any
    ).languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    (monaco as any).languages.typescript.typescriptDefaults.setCompilerOptions({
      jsx: (monaco as any).languages.typescript.JsxEmit.React,
      jsxFactory: "React.createElement",
      reactNamespace: "React",
      allowNonTsExtensions: true,
      allowJs: true,
      target: (monaco as any).languages.typescript.ScriptTarget.Latest,
    });

    // Configure editor options
    (editor as any).updateOptions({
      fontSize,
      tabSize,
      wordWrap: wordWrap ? "on" : "off",
      minimap: { enabled: minimap },
      automaticLayout: true,
      scrollBeyondLastLine: false,
      renderWhitespace: "none",
      renderLineHighlight: "all",
      lineNumbersMinChars: 3,
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: false,
        indentation: false,
      },
    });

    // Add keyboard shortcuts
    (editor as any).addCommand(
      (monaco as any).KeyMod.CtrlCmd | (monaco as any).KeyCode.KeyS,
      () => {
        if (currentFile) {
          markFileAsSaved(currentFile.path);
        }
      }
    );
  };

  // Update editor options when UI settings change
  useEffect(() => {
    if (editorRef.current) {
      (editorRef.current as any).updateOptions({
        fontSize,
        tabSize,
        wordWrap: wordWrap ? "on" : "off",
        minimap: { enabled: minimap },
        renderWhitespace: "none",
        renderLineHighlight: "all",
        lineNumbersMinChars: 3,
        guides: {
          bracketPairs: false,
          indentation: false,
        },
      });
    }
  }, [fontSize, tabSize, wordWrap, minimap]);

  // Update theme when it changes
  useEffect(() => {
    if (editorRef.current) {
      const monaco = (editorRef.current as any).getModel()?.getLanguageId();
      if (monaco) {
        import("@monaco-editor/react").then(({ loader }) => {
          loader.init().then((monaco) => {
            (monaco as any).editor.setTheme("brilliance-black");
          });
        });
      }
    }
  }, [theme]);

  if (!currentFile) {
    return (
      <div
        className={cn(
          "h-full w-full min-h-[500px] flex items-center justify-center bg-background text-muted-foreground",
          className
        )}
      >
        <div className="text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-2">No file selected</h3>
          <p className="text-sm">Select a file to view its contents</p>
        </div>
      </div>
    );
  }

  if (currentFile.type === "folder") {
    return (
      <div
        className={cn(
          "h-full w-full min-h-[500px] flex items-center justify-center bg-background text-muted-foreground",
          className
        )}
      >
        <div className="text-center">
          <Folder className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-2">Folder selected</h3>
          <p className="text-sm">Select a file to edit its contents</p>
        </div>
      </div>
    );
  }

  const language = getLanguageFromPath(currentFile.path);

  // Create breadcrumb path
  const pathSegments = currentFile.path.split("/").filter(Boolean);

  return (
    <div className={cn("h-full w-full min-h-[500px] flex flex-col", className)}>
      {/* File Path Header */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-background text-xs text-muted-foreground">
        {pathSegments.map((segment, index) => (
          <div key={index} className="flex text-base items-center gap-1.5">
            <span
              className={
                index === pathSegments.length - 1 ? "text-foreground  " : ""
              }
            >
              {segment}
            </span>
            {index < pathSegments.length - 1 && (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>
        ))}
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          key={currentFile.path}
          height="100%"
          language={language}
          value={currentFile.content || ""}
          theme="brilliance-black"
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            readOnly: true,
            domReadOnly: true,
            fontSize,
            tabSize,
            wordWrap: wordWrap ? "on" : "off",
            minimap: { enabled: minimap },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            renderWhitespace: "none",
            renderLineHighlight: "all",
            lineNumbersMinChars: 3,
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: false,
              indentation: false,
            },
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            parameterHints: { enabled: true },
            formatOnPaste: true,
            formatOnType: true,
          }}
          loading={
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-primary"></div>
            </div>
          }
        />
      </div>
    </div>
  );
}
