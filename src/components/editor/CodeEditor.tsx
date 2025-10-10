"use client";

import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { useProjectStore } from "@/lib/stores/projectStore";
import { useUIStore } from "@/lib/stores/uiStore";
import { getLanguageFromPath, findFileNode } from "@/lib/utils/fileSystem";
import { debounce } from "@/lib/utils/helpers";
import { initializeMonaco } from "@/lib/monaco/setup";
import { initializeTypeDefinitions } from "@/lib/monaco/typeDefinitions";

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
  const {
    files,
    selectedFile,
    updateFileContent,
    markFileAsUnsaved,
    markFileAsSaved,
  } = useProjectStore();
  const { theme, fontSize, tabSize, wordWrap, minimap } = useUIStore();

  const currentFile = selectedFile
    ? findFileNode(files, selectedFile)
    : undefined;

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

    // Configure Monaco themes
    (monaco as any).editor.defineTheme("codecraft-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6A9955" },
        { token: "keyword", foreground: "569CD6" },
        { token: "string", foreground: "CE9178" },
        { token: "number", foreground: "B5CEA8" },
        { token: "type", foreground: "4EC9B0" },
        { token: "function", foreground: "DCDCAA" },
      ],
      colors: {
        "editor.background": "#0a0a0a",
        "editor.foreground": "#ededed",
        "editorLineNumber.foreground": "#858585",
        "editor.selectionBackground": "#264f78",
        "editor.inactiveSelectionBackground": "#3a3d41",
      },
    });

    (monaco as any).editor.defineTheme("codecraft-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "comment", foreground: "008000" },
        { token: "keyword", foreground: "0000FF" },
        { token: "string", foreground: "A31515" },
        { token: "number", foreground: "098658" },
        { token: "type", foreground: "267F99" },
        { token: "function", foreground: "795E26" },
      ],
      colors: {
        "editor.background": "#ffffff",
        "editor.foreground": "#000000",
      },
    });

    // Set theme
    (monaco as any).editor.setTheme(
      theme === "dark" ? "codecraft-dark" : "codecraft-light"
    );

    // Configure editor options
    (editor as any).updateOptions({
      fontSize,
      tabSize,
      wordWrap: wordWrap ? "on" : "off",
      minimap: { enabled: minimap },
      automaticLayout: true,
      scrollBeyondLastLine: false,
      renderWhitespace: "selection",
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true,
      },
    });

    // Add keyboard shortcuts
    (editor as any).addCommand((monaco as any).KeyMod.CtrlCmd | (monaco as any).KeyCode.KeyS, () => {
      if (currentFile) {
        markFileAsSaved(currentFile.path);
      }
    });
  };

  // Update editor options when UI settings change
  useEffect(() => {
    if (editorRef.current) {
      (editorRef.current as any).updateOptions({
        fontSize,
        tabSize,
        wordWrap: wordWrap ? "on" : "off",
        minimap: { enabled: minimap },
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
            (monaco as any).editor.setTheme(
              theme === "dark" ? "codecraft-dark" : "codecraft-light"
            );
          });
        });
      }
    }
  }, [theme]);

  if (!currentFile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background text-muted-foreground">
        <div className="text-center">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg font-semibold mb-2">No file selected</h3>
          <p className="text-sm">Select a file to view its contents</p>
        </div>
      </div>
    );
  }

  if (currentFile.type === "folder") {
    return (
      <div className="flex-1 flex items-center justify-center bg-background text-muted-foreground">
        <div className="text-center">
          <div className="text-6xl mb-4">📁</div>
          <h3 className="text-lg font-semibold mb-2">Folder selected</h3>
          <p>Select a file to edit its contents</p>
        </div>
      </div>
    );
  }

  const language = getLanguageFromPath(currentFile.path);

  return (
    <div className={className}>
      <Editor
        height="704px"
        language={language}
        value={currentFile.content || ""}
        theme={theme === "dark" ? "codecraft-dark" : "codecraft-light"}
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
          renderWhitespace: "selection",
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
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
  );
}
