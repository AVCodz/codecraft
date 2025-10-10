"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useUIStore } from "@/lib/stores/uiStore";
import { useWebContainerContext } from "@/lib/contexts/WebContainerContext";
import { PreviewToolbar } from "./PreviewToolbar";
import { cn } from "@/lib/utils/helpers";

interface PreviewProps {
  className?: string;
}

export function Preview({ className }: PreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { previewMode } = useUIStore();
  const {
    serverUrl,
    isBooting,
    isReady,
    error: webContainerError,
  } = useWebContainerContext();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update loading state based on WebContainer
  useEffect(() => {
    if (isBooting) {
      setIsLoading(true);
      setError(null);
    } else if (webContainerError) {
      setIsLoading(false);
      setError(webContainerError);
    } else if (isReady && !serverUrl) {
      setIsLoading(true);
      setError(null);
    } else if (serverUrl) {
      setIsLoading(false);
      setError(null);
    }
  }, [isBooting, isReady, serverUrl, webContainerError]);

  // Handle iframe load with cleanup
  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);

    // Inject error handling into iframe
    if (iframeRef.current?.contentWindow) {
      const iframe = iframeRef.current;
      const contentWindow = iframe.contentWindow;

      if (contentWindow) {
        try {
          const errorHandler = (event: ErrorEvent) => {
            console.error("Preview error:", event.error);
            setError(
              `Runtime error: ${event.error?.message || "Unknown error"}`
            );
          };

          const rejectionHandler = (event: PromiseRejectionEvent) => {
            console.error("Preview promise rejection:", event.reason);
            setError(`Promise rejection: ${event.reason}`);
          };

          contentWindow.addEventListener("error", errorHandler);
          contentWindow.addEventListener(
            "unhandledrejection",
            rejectionHandler
          );

          // Store cleanup function
          const cleanup = () => {
            try {
              contentWindow.removeEventListener("error", errorHandler);
              contentWindow.removeEventListener(
                "unhandledrejection",
                rejectionHandler
              );
            } catch {
              // Ignore cleanup errors (iframe may be destroyed)
            }
          };

          // Store cleanup function on iframe for later use
          (iframe as any)._previewCleanup = cleanup;
        } catch {
          // Cross-origin restrictions might prevent this
          console.warn("Could not inject error handlers into iframe");
        }
      }
    }
  }, []);

  // Cleanup effect for memory leak prevention
  useEffect(() => {
    return () => {
      // Cleanup iframe event listeners on unmount
      if (iframeRef.current) {
        const cleanup = (iframeRef.current as any)._previewCleanup;
        if (cleanup) {
          cleanup();
        }
        // Clear the reference
        (iframeRef.current as any)._previewCleanup = null;
      }
    };
  }, []);

  const handleRefresh = useCallback(() => {
    // Clean up previous iframe before refresh
    if (iframeRef.current) {
      const cleanup = (iframeRef.current as any)._previewCleanup;
      if (cleanup) {
        cleanup();
      }

      setIsLoading(true);
      setError(null);
      iframeRef.current.src = iframeRef.current.src;
    }
  }, []);

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

  // Show booting state
  if (isBooting) {
    return (
      <div className={cn("flex flex-col h-full bg-background", className)}>
        <PreviewToolbar onRefresh={handleRefresh} />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">
              Booting WebContainer...
            </h3>
            <p className="text-sm">This may take a moment</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      <PreviewToolbar onRefresh={handleRefresh} />

      <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-950">
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

        {!isLoading && !error && serverUrl && (
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
                src={serverUrl}
                className="w-full h-full border-0"
                style={{ minHeight: "600px" }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                title="Preview"
                onLoad={handleIframeLoad}
              />
            </div>
          </div>
        )}

        {!isLoading && !error && !serverUrl && isReady && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">
                Starting dev server...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
