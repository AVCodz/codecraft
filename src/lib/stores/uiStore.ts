import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStore {
  // Layout state
  sidebarCollapsed: boolean;
  terminalCollapsed: boolean;
  previewMode: 'desktop' | 'tablet' | 'mobile';
  theme: 'light' | 'dark';
  
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
  
  // Actions
  toggleSidebar: () => void;
  toggleTerminal: () => void;
  setPreviewMode: (mode: 'desktop' | 'tablet' | 'mobile') => void;
  setTheme: (theme: 'light' | 'dark') => void;
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
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      // Initial state
      sidebarCollapsed: false,
      terminalCollapsed: true,
      previewMode: 'desktop',
      theme: 'dark',
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

      // Actions
      toggleSidebar: () => set((state) => ({ 
        sidebarCollapsed: !state.sidebarCollapsed 
      })),
      
      toggleTerminal: () => set((state) => ({ 
        terminalCollapsed: !state.terminalCollapsed 
      })),
      
      setPreviewMode: (mode) => set({ previewMode: mode }),
      setTheme: (theme) => set({ theme }),
      setFontSize: (size) => set({ fontSize: Math.max(8, Math.min(32, size)) }),
      setTabSize: (size) => set({ tabSize: Math.max(1, Math.min(8, size)) }),
      toggleWordWrap: () => set((state) => ({ wordWrap: !state.wordWrap })),
      toggleMinimap: () => set((state) => ({ minimap: !state.minimap })),
      
      setEditorWidth: (width) => {
        const clampedWidth = Math.max(20, Math.min(80, width));
        set({ 
          editorWidth: clampedWidth,
          previewWidth: 100 - clampedWidth
        });
      },
      
      setPreviewWidth: (width) => {
        const clampedWidth = Math.max(20, Math.min(80, width));
        set({ 
          previewWidth: clampedWidth,
          editorWidth: 100 - clampedWidth
        });
      },
      
      setTerminalHeight: (height) => set({ 
        terminalHeight: Math.max(100, Math.min(500, height)) 
      }),
      
      openCreateProjectModal: () => set({ isCreateProjectModalOpen: true }),
      closeCreateProjectModal: () => set({ isCreateProjectModalOpen: false }),
      openSettingsModal: () => set({ isSettingsModalOpen: true }),
      closeSettingsModal: () => set({ isSettingsModalOpen: false }),
      openExportModal: () => set({ isExportModalOpen: true }),
      closeExportModal: () => set({ isExportModalOpen: false }),
    }),
    {
      name: 'codecraft-ui-store',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        terminalCollapsed: state.terminalCollapsed,
        previewMode: state.previewMode,
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
