/**
 * Preview - Live application preview with device modes
 * Renders iframe preview of running Daytona sandbox application
 * Features: Desktop/mobile/tablet views, auto-refresh, error handling, loading states
 * Used in: Project page preview mode to view live application output
 */
"use client";

import { useEffect, useState, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { useUIStore } from "@/lib/stores/uiStore";
import { useDaytonaContext } from "@/lib/contexts/DaytonaContext";
import { cn } from "@/lib/utils/helpers";

interface PreviewProps {
  className?: string;
}

export interface PreviewRef {
  reloadIframe: () => void;
}

export const Preview = forwardRef<PreviewRef, PreviewProps>(({ className }, ref) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { previewMode } = useUIStore();
  const {
    previewUrl,
    isBooting,
    error: daytonaError,
  } = useDaytonaContext();
  const [isLoading, setIsLoading] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [showIframe, setShowIframe] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep loading until both preview URL is ready AND iframe has loaded
  useEffect(() => {
    if (isBooting || !previewUrl) {
      setIsLoading(true);
      setIframeLoaded(false);
      setShowIframe(false);
      setError(null);
    } else if (daytonaError) {
      setIsLoading(false);
      setError(daytonaError);
    } else if (previewUrl) {
      // Wait 3 seconds before showing iframe to let dev server fully start
      const timer = setTimeout(() => {
        setShowIframe(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isBooting, previewUrl, daytonaError]);

  // Handle iframe load with cleanup
  const handleIframeLoad = useCallback(() => {
    console.log("[Preview] 🎉 Iframe loaded successfully");
    setIframeLoaded(true);
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

  // Expose reload method to parent via ref
  useImperativeHandle(ref, () => ({
    reloadIframe: handleRefresh
  }));

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
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">
              Creating Sandbox...
            </h3>
            <p className="text-sm">This may take a moment</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-950">
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

        {previewUrl && showIframe && (
          <div className="flex justify-center items-stretch h-full relative">
            {/* Show loading overlay until iframe is fully loaded */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">
                    Loading preview...
                  </p>
                </div>
              </div>
            )}
            <div
              className="bg-white shadow-lg rounded-lg overflow-hidden transition-all duration-300 flex flex-col relative"
              style={{
                width: getPreviewWidth(),
                maxWidth: "100%",
                height: "100%",
                opacity: iframeLoaded ? 1 : 0,
                transition: "opacity 0.3s ease-in-out",
                zIndex: 1,
              }}
            >
              <iframe
                ref={iframeRef}
                src={previewUrl}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                title="Preview"
                onLoad={handleIframeLoad}
              />
            </div>
          </div>
        )}

        {!error && (!previewUrl || !showIframe) && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">
                {previewUrl ? "Starting dev server..." : "Preparing preview..."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

Preview.displayName = "Preview";
