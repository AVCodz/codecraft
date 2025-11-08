/**
 * UI STORE - Manages global UI state and user preferences with persistence
 * 
 * Purpose: Handle layout state, theme, editor preferences, and UI toggles across the app
 * Used by: Layout components, editor, preview panel, settings
 * Key Features: Zustand persistence, sidebar/terminal collapse, theme switching, editor preferences
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIStore {
  // Layout state
  sidebarCollapsed: boolean;
  terminalCollapsed: boolean;
  previewMode: "desktop" | "tablet" | "mobile";
  rightPanelMode: "preview" | "code"; // New: toggle between preview and code view
  theme: "brilliance-black";

  // Editor preferences
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;

  // Panel sizes (for resizable panels)
  editorWidth: number;
  previewWidth: number;
  terminalHeight: number;

  // Modal states
  isCreateProjectModalOpen: boolean;
  isSettingsModalOpen: boolean;
  isExportModalOpen: boolean;

  // File search
  fileSearchQuery: string;

  // Actions
  toggleSidebar: () => void;
  toggleTerminal: () => void;
  setPreviewMode: (mode: "desktop" | "tablet" | "mobile") => void;
  setRightPanelMode: (mode: "preview" | "code") => void;
  toggleRightPanelMode: () => void;
  setTheme: (theme: "brilliance-black") => void;
  setFontSize: (size: number) => void;
  setTabSize: (size: number) => void;
  toggleWordWrap: () => void;
  toggleMinimap: () => void;
  setEditorWidth: (width: number) => void;
  setPreviewWidth: (width: number) => void;
  setTerminalHeight: (height: number) => void;
  openCreateProjectModal: () => void;
  closeCreateProjectModal: () => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  openExportModal: () => void;
  closeExportModal: () => void;
  setFileSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, _get) => ({
      // Initial state
      sidebarCollapsed: false,
      terminalCollapsed: true,
      previewMode: "desktop",
      rightPanelMode: "preview",
      theme: "brilliance-black",
      fontSize: 14,
      tabSize: 2,
      wordWrap: false,
      minimap: false,
      editorWidth: 60,
      previewWidth: 40,
      terminalHeight: 200,
      isCreateProjectModalOpen: false,
      isSettingsModalOpen: false,
      isExportModalOpen: false,
      fileSearchQuery: "",

      // Actions
      toggleSidebar: () =>
        set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed,
        })),

      toggleTerminal: () =>
        set((state) => ({
          terminalCollapsed: !state.terminalCollapsed,
        })),

      setPreviewMode: (mode) => set({ previewMode: mode }),
      setRightPanelMode: (mode) => set({ rightPanelMode: mode }),
      toggleRightPanelMode: () =>
        set((state) => ({
          rightPanelMode:
            state.rightPanelMode === "preview" ? "code" : "preview",
        })),
      setTheme: (theme) => set({ theme }),
      setFontSize: (size) => set({ fontSize: Math.max(8, Math.min(32, size)) }),
      setTabSize: (size) => set({ tabSize: Math.max(1, Math.min(8, size)) }),
      toggleWordWrap: () => set((state) => ({ wordWrap: !state.wordWrap })),
      toggleMinimap: () => set((state) => ({ minimap: !state.minimap })),

      setEditorWidth: (width) => {
        const clampedWidth = Math.max(20, Math.min(80, width));
        set({
          editorWidth: clampedWidth,
          previewWidth: 100 - clampedWidth,
        });
      },

      setPreviewWidth: (width) => {
        const clampedWidth = Math.max(20, Math.min(80, width));
        set({
          previewWidth: clampedWidth,
          editorWidth: 100 - clampedWidth,
        });
      },

      setTerminalHeight: (height) =>
        set({
          terminalHeight: Math.max(100, Math.min(500, height)),
        }),

      openCreateProjectModal: () => set({ isCreateProjectModalOpen: true }),
      closeCreateProjectModal: () => set({ isCreateProjectModalOpen: false }),
      openSettingsModal: () => set({ isSettingsModalOpen: true }),
      closeSettingsModal: () => set({ isSettingsModalOpen: false }),
      openExportModal: () => set({ isExportModalOpen: true }),
      closeExportModal: () => set({ isExportModalOpen: false }),
      setFileSearchQuery: (query) => set({ fileSearchQuery: query }),
    }),
    {
      name: "codecraft-ui-store",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        terminalCollapsed: state.terminalCollapsed,
        previewMode: state.previewMode,
        rightPanelMode: state.rightPanelMode,
        theme: state.theme,
        fontSize: state.fontSize,
        tabSize: state.tabSize,
        wordWrap: state.wordWrap,
        minimap: state.minimap,
        editorWidth: state.editorWidth,
        previewWidth: state.previewWidth,
        terminalHeight: state.terminalHeight,
      }),
    }
  )
);
