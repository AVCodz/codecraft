"use client";

import { useEffect, useState, useRef } from "react";
import { useProjectStore } from "@/lib/stores/projectStore";
import { useUIStore } from "@/lib/stores/uiStore";
import { PreviewToolbar } from "./PreviewToolbar";
import { generatePreviewHTML } from "@/lib/utils/previewGenerator";
import { cn } from "@/lib/utils/helpers";

interface PreviewProps {
  className?: string;
}

export function Preview({ className }: PreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { files, currentProject } = useProjectStore();
  const { previewMode } = useUIStore();
  const [previewHtml, setPreviewHtml] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate preview HTML when files change
  useEffect(() => {
    if (files.length === 0) {
      setPreviewHtml("");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const html = generatePreviewHTML(
        files,
        currentProject?.framework || "react"
      );
      setPreviewHtml(html);
    } catch (err) {
      console.error("Error generating preview:", err);
      setError("Failed to generate preview");
    } finally {
      setIsLoading(false);
    }
  }, [files, currentProject?.framework]);

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);

    // Inject error handling into iframe
    if (iframeRef.current?.contentWindow) {
      const iframe = iframeRef.current;
      const contentWindow = iframe.contentWindow;

      if (contentWindow) {
        try {
          contentWindow.addEventListener("error", (event) => {
            console.error("Preview error:", event.error);
            setError(
              `Runtime error: ${event.error?.message || "Unknown error"}`
            );
          });

          contentWindow.addEventListener("unhandledrejection", (event) => {
            console.error("Preview promise rejection:", event.reason);
            setError(`Promise rejection: ${event.reason}`);
          });
        } catch (err) {
          // Cross-origin restrictions might prevent this
          console.warn("Could not inject error handlers into iframe");
        }
      }
    }
  };

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const getPreviewWidth = () => {
    switch (previewMode) {
      case "mobile":
        return "375px";
      case "tablet":
        return "768px";
      case "desktop":
      default:
        return "100%";
    }
  };

  if (files.length === 0) {
    return (
      <div className={cn("flex flex-col h-full bg-background", className)}>
        <PreviewToolbar onRefresh={handleRefresh} />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <div className="text-6xl mb-4">🖥️</div>
            <h3 className="text-lg font-semibold mb-2">No preview available</h3>
            <p>Create some files to see a live preview</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      <PreviewToolbar onRefresh={handleRefresh} />

      <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">
                Loading preview...
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md p-6">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold mb-2 text-destructive">
                Preview Error
              </h3>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <button
                onClick={handleRefresh}
                className="text-sm text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {!isLoading && !error && previewHtml && (
          <div className="flex justify-center p-4">
            <div
              className="bg-white shadow-lg rounded-lg overflow-hidden transition-all duration-300"
              style={{
                width: getPreviewWidth(),
                maxWidth: "100%",
                minHeight: "600px",
              }}
            >
              <iframe
                ref={iframeRef}
                srcDoc={previewHtml}
                className="w-full h-full border-0"
                style={{ minHeight: "600px" }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                title="Preview"
                onLoad={handleIframeLoad}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
