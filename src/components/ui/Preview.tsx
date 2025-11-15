/**
 * Preview - Live application preview with device modes
 * Renders iframe preview of running Daytona sandbox application
 * Features: Desktop/mobile/tablet views, auto-refresh, error handling, loading states
 * Used in: Project page preview mode to view live application output
 */
"use client";

import {
  useEffect,
  useState,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useUIStore } from "@/lib/stores/uiStore";
import { useDaytonaContext } from "@/lib/contexts/DaytonaContext";
import { cn } from "@/lib/utils/helpers";
import { PreviewLoader } from "./PreviewLoader";
import { DevServerLoader } from "./DevServerLoader";

interface PreviewProps {
  className?: string;
}

export interface PreviewRef {
  reloadIframe: () => void;
}

export const Preview = forwardRef<PreviewRef, PreviewProps>(
  ({ className }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const { previewMode } = useUIStore();
    const { previewUrl, isBooting, error: daytonaError } = useDaytonaContext();
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
            (iframe as HTMLIFrameElement & { _previewCleanup?: () => void })._previewCleanup = cleanup;
          } catch {
            // Cross-origin restrictions might prevent this
            console.warn("Could not inject error handlers into iframe");
          }
        }
      }
    }, []);

    // Cleanup effect for memory leak prevention
    useEffect(() => {
      const currentIframe = iframeRef.current;
      return () => {
        // Cleanup iframe event listeners on unmount
        if (currentIframe) {
          const cleanup = (currentIframe as HTMLIFrameElement & { _previewCleanup?: () => void })._previewCleanup;
          if (cleanup) {
            cleanup();
          }
          // Clear the reference
          (currentIframe as HTMLIFrameElement & { _previewCleanup?: (() => void) | null })._previewCleanup = null;
        }
      };
    }, []);

    const handleRefresh = useCallback(() => {
      // Clean up previous iframe before refresh
      if (iframeRef.current) {
        const cleanup = (iframeRef.current as HTMLIFrameElement & { _previewCleanup?: () => void })._previewCleanup;
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
      reloadIframe: handleRefresh,
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

    // Show loading state until preview URL is available
    if (isBooting || !previewUrl) {
      return (
        <div className={cn("flex flex-col h-full bg-background", className)}>
          <PreviewLoader />
        </div>
      );
    }

    return (
      <div className={cn("flex flex-col h-full bg-background", className)}>
        <div className="flex-1 overflow-auto bg-background">
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
                <div className="absolute inset-0 flex items-center justify-center bg-background z-10 overflow-hidden">
                  {/* Grid Background */}
                  <svg
                    viewBox="0 0 900 900"
                    xmlns="http://www.w3.org/2000/svg"
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full"
                  >
                    <g id="grid">
                      <g>
                        {[0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600].map((x) => (
                          <line
                            key={`v-${x}`}
                            x1={x}
                            y1="0"
                            x2={x}
                            y2="100%"
                            className="stroke-neutral-800 stroke-[0.5]"
                          />
                        ))}
                      </g>
                      <g>
                        {[100, 200, 300, 400, 500, 600, 700, 800].map((y) => (
                          <line
                            key={`h-${y}`}
                            x1="0"
                            y1={y}
                            x2="100%"
                            y2={y}
                            className="stroke-neutral-800 stroke-[0.5]"
                          />
                        ))}
                      </g>
                    </g>
                  </svg>

                  {/* Loader Content */}
                  <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">
                    <svg viewBox="0 0 240 240" height="240" width="240" className="w-24 h-24">
                      <circle
                        strokeLinecap="round"
                        strokeDashoffset="-330"
                        strokeDasharray="0 660"
                        strokeWidth="20"
                        stroke="currentColor"
                        fill="none"
                        r="105"
                        cy="120"
                        cx="120"
                        className="text-primary animate-ring-a"
                      />
                      <circle
                        strokeLinecap="round"
                        strokeDashoffset="-110"
                        strokeDasharray="0 220"
                        strokeWidth="20"
                        stroke="currentColor"
                        fill="none"
                        r="35"
                        cy="120"
                        cx="120"
                        className="text-neutral-500 animate-ring-b"
                      />
                      <circle
                        strokeLinecap="round"
                        strokeDasharray="0 440"
                        strokeWidth="20"
                        stroke="currentColor"
                        fill="none"
                        r="70"
                        cy="120"
                        cx="85"
                        className="text-neutral-600 animate-ring-c"
                      />
                      <circle
                        strokeLinecap="round"
                        strokeDasharray="0 440"
                        strokeWidth="20"
                        stroke="currentColor"
                        fill="none"
                        r="70"
                        cy="120"
                        cx="155"
                        className="text-primary animate-ring-d"
                      />
                    </svg>
                    <div className="mt-6 text-center">
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        Loading Preview
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Please wait while we load your application...
                      </p>
                    </div>
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

          {!error && !showIframe && (
            <div className="flex items-center justify-center h-full">
              <DevServerLoader />
            </div>
          )}
        </div>
      </div>
    );
  }
);

Preview.displayName = "Preview";

// Add global styles for ring animations
if (typeof document !== 'undefined') {
  const styleId = 'preview-ring-animations';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes ringA {
        from, 4% { stroke-dasharray: 0 660; stroke-width: 20; stroke-dashoffset: -330; }
        12% { stroke-dasharray: 60 600; stroke-width: 30; stroke-dashoffset: -335; }
        32% { stroke-dasharray: 60 600; stroke-width: 30; stroke-dashoffset: -595; }
        40%, 54% { stroke-dasharray: 0 660; stroke-width: 20; stroke-dashoffset: -660; }
        62% { stroke-dasharray: 60 600; stroke-width: 30; stroke-dashoffset: -665; }
        82% { stroke-dasharray: 60 600; stroke-width: 30; stroke-dashoffset: -925; }
        90%, to { stroke-dasharray: 0 660; stroke-width: 20; stroke-dashoffset: -990; }
      }
      @keyframes ringB {
        from, 12% { stroke-dasharray: 0 220; stroke-width: 20; stroke-dashoffset: -110; }
        20% { stroke-dasharray: 20 200; stroke-width: 30; stroke-dashoffset: -115; }
        40% { stroke-dasharray: 20 200; stroke-width: 30; stroke-dashoffset: -195; }
        48%, 62% { stroke-dasharray: 0 220; stroke-width: 20; stroke-dashoffset: -220; }
        70% { stroke-dasharray: 20 200; stroke-width: 30; stroke-dashoffset: -225; }
        90% { stroke-dasharray: 20 200; stroke-width: 30; stroke-dashoffset: -305; }
        98%, to { stroke-dasharray: 0 220; stroke-width: 20; stroke-dashoffset: -330; }
      }
      @keyframes ringC {
        from { stroke-dasharray: 0 440; stroke-width: 20; stroke-dashoffset: 0; }
        8% { stroke-dasharray: 40 400; stroke-width: 30; stroke-dashoffset: -5; }
        28% { stroke-dasharray: 40 400; stroke-width: 30; stroke-dashoffset: -175; }
        36%, 58% { stroke-dasharray: 0 440; stroke-width: 20; stroke-dashoffset: -220; }
        66% { stroke-dasharray: 40 400; stroke-width: 30; stroke-dashoffset: -225; }
        86% { stroke-dasharray: 40 400; stroke-width: 30; stroke-dashoffset: -395; }
        94%, to { stroke-dasharray: 0 440; stroke-width: 20; stroke-dashoffset: -440; }
      }
      @keyframes ringD {
        from, 8% { stroke-dasharray: 0 440; stroke-width: 20; stroke-dashoffset: 0; }
        16% { stroke-dasharray: 40 400; stroke-width: 30; stroke-dashoffset: -5; }
        36% { stroke-dasharray: 40 400; stroke-width: 30; stroke-dashoffset: -175; }
        44%, 50% { stroke-dasharray: 0 440; stroke-width: 20; stroke-dashoffset: -220; }
        58% { stroke-dasharray: 40 400; stroke-width: 30; stroke-dashoffset: -225; }
        78% { stroke-dasharray: 40 400; stroke-width: 30; stroke-dashoffset: -395; }
        86%, to { stroke-dasharray: 0 440; stroke-width: 20; stroke-dashoffset: -440; }
      }
      .animate-ring-a { animation: ringA 2s linear infinite; }
      .animate-ring-b { animation: ringB 2s linear infinite; }
      .animate-ring-c { animation: ringC 2s linear infinite; }
      .animate-ring-d { animation: ringD 2s linear infinite; }
    `;
    document.head.appendChild(style);
  }
}
