"use client";

import {
  RefreshCw,
  Smartphone,
  Monitor,
  Maximize,
  Minimize,
  RotateCw,
} from "lucide-react";
import { useDaytonaContext } from "@/lib/contexts/DaytonaContext";
import { useState } from "react";

interface PreviewToolbarProps {
  onReloadIframe: () => void;
  onRefreshPreview: () => void;
  onExportProject?: () => void;
  previewMode: "desktop" | "mobile" | "tablet";
  onTogglePreviewMode: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

export function PreviewToolbar({
  onReloadIframe,
  onRefreshPreview,
  previewMode,
  onTogglePreviewMode,
  onToggleFullscreen,
  isFullscreen = false,
}: PreviewToolbarProps) {
  const { restartDevServer, isBooting } = useDaytonaContext();
  const [isRestarting, setIsRestarting] = useState(false);

  const handleRestartServer = async () => {
    try {
      setIsRestarting(true);
      await restartDevServer();
      onRefreshPreview(); // Refresh the component after restart
    } catch (error) {
      console.error("[PreviewToolbar] Failed to restart server:", error);
    } finally {
      setIsRestarting(false);
    }
  };

  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-background p-0.5 shadow-sm">
      {/* Reload Iframe Only */}
      <button
        onClick={onReloadIframe}
        className="flex items-center justify-center rounded-lg px-1.5 py-1.5 text-xs font-medium transition-colors duration-300 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        title="Reload Iframe (Quick)"
        disabled={isBooting || isRestarting}
      >
        <RefreshCw className="h-4 w-4" />
      </button>

      {/* Restart Dev Server */}
      <button
        onClick={handleRestartServer}
        className="flex items-center justify-center rounded-lg px-1.5 py-1.5 text-xs font-medium transition-colors duration-300 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        title="Restart Dev Server (Full Restart)"
        disabled={isBooting || isRestarting}
      >
        {isRestarting ? (
          <RotateCw className="h-4 w-4 text-primary animate-spin" />
        ) : (
          <RotateCw className="h-4 w-4 text-primary" />
        )}
      </button>

      {!isFullscreen && (
        <>
          {/* Mobile/Desktop Toggler */}
          <button
            onClick={onTogglePreviewMode}
            className="flex items-center justify-center rounded-lg px-1.5 py-1.5 text-xs font-medium transition-colors duration-300 text-muted-foreground hover:bg-muted hover:text-foreground"
            title={
              previewMode === "desktop"
                ? "Switch to Mobile View"
                : "Switch to Desktop View"
            }
          >
            {previewMode === "desktop" ? (
              <Smartphone className="h-4 w-4" />
            ) : (
              <Monitor className="h-4 w-4" />
            )}
          </button>

          {/* Fullscreen Toggle */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="flex items-center justify-center rounded-lg px-1.5 py-1.5 text-xs font-medium transition-colors duration-300 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Fullscreen Preview"
            >
              <Maximize className="h-4 w-4" />
            </button>
          )}
        </>
      )}

      {isFullscreen && onToggleFullscreen && (
        <>
          {/* Mobile/Desktop Toggler */}
          <button
            onClick={onTogglePreviewMode}
            className="flex items-center justify-center rounded-lg px-1.5 py-1.5 text-xs font-medium transition-colors duration-300 text-muted-foreground hover:bg-muted hover:text-foreground"
            title={
              previewMode === "desktop"
                ? "Switch to Mobile View"
                : "Switch to Desktop View"
            }
          >
            {previewMode === "desktop" ? (
              <Smartphone className="h-4 w-4" />
            ) : (
              <Monitor className="h-4 w-4" />
            )}
          </button>

          {/* Exit Fullscreen */}
          <button
            onClick={onToggleFullscreen}
            className="flex items-center justify-center rounded-lg px-1.5 py-1.5 text-xs font-medium transition-colors duration-300 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Exit Fullscreen"
          >
            <Minimize className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
