"use client";

import { Button } from "@/components/ui/Button";
import { RefreshCw, Smartphone, Monitor, Maximize, Minimize, RotateCw } from "lucide-react";
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
    <div className="flex bg-black rounded-xl border border-border">
      {/* Reload Iframe Only */}
      <Button
        size="icon"
        variant="ghost"
        onClick={onReloadIframe}
        className="h-8 w-8"
        title="Reload Iframe (Quick)"
        disabled={isBooting || isRestarting}
      >
        <RefreshCw className="h-4 w-4" />
      </Button>

      {/* Restart Dev Server */}
      <Button
        size="icon"
        variant="ghost"
        onClick={handleRestartServer}
        className="h-8 w-8"
        title="Restart Dev Server (Full Restart)"
        disabled={isBooting || isRestarting}
      >
        {isRestarting ? (
          <RotateCw className="h-4 w-4 text-orange-500 animate-spin" />
        ) : (
          <RotateCw className="h-4 w-4 text-orange-500" />
        )}
      </Button>

      {!isFullscreen && (
        <>
          {/* Mobile/Desktop Toggler */}
          <Button
            size="icon"
            variant="ghost"
            onClick={onTogglePreviewMode}
            className="h-8 w-8"
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
          </Button>

          {/* Fullscreen Toggle */}
          {onToggleFullscreen && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onToggleFullscreen}
              className="h-8 w-8"
              title="Fullscreen Preview"
            >
              <Maximize className="h-4 w-4" />
            </Button>
          )}
        </>
      )}

      {isFullscreen && onToggleFullscreen && (
        <>
          {/* Mobile/Desktop Toggler */}
          <Button
            size="icon"
            variant="ghost"
            onClick={onTogglePreviewMode}
            className="h-8 w-8"
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
          </Button>

          {/* Exit Fullscreen */}
          <Button
            size="icon"
            variant="ghost"
            onClick={onToggleFullscreen}
            className="h-8 w-8"
            title="Exit Fullscreen"
          >
            <Minimize className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
