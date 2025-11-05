/**
 * StreamingAssistantMessage - Complete assistant message with thinking, tool calls, and content
 * Combines all streaming elements into a cohesive UI
 */
"use client";

import ReactMarkdown from "react-markdown";
import { AlertCircle } from "lucide-react";
import { ToolCallsList } from "./ToolCallsList";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { ToolCallState } from "@/lib/types/streaming";
import { Button } from "@/components/ui/Button";
import { CodeBlock } from "./CodeBlock";
import ShinyText from "./ShinyText";
import { useRotatingText } from "@/lib/hooks/useRotatingText";

interface StreamingAssistantMessageProps {
  content: string;
  toolCalls: ToolCallState[];
  thinkingStartTime?: number;
  thinkingEndTime?: number;
  isThinking: boolean;
  error?: {
    message: string;
    recoverable: boolean;
  };
  onRetry?: () => void;
  onContinue?: () => void;
}

export function StreamingAssistantMessage({
  content,
  toolCalls,
  thinkingStartTime,
  thinkingEndTime,
  isThinking,
  error,
  onRetry,
  onContinue,
}: StreamingAssistantMessageProps) {
  const rotatingMessage = useRotatingText(
    [
      "Analyzing your request...",
      "Building response...",
      "Evaluating options...",
      "Processing context...",
      "Crafting solution...",
      "Finalizing details...",
    ],
    10000
  );

  return (
    <div className="max-w-[100%] space-y-3 p-7">
      {/* VibeIt label - matches MessageList */}
      <div className="font-brand text-lg">VibeIt</div>
      {/* Thinking indicator */}
      <ThinkingIndicator
        startTime={thinkingStartTime}
        endTime={thinkingEndTime}
        isThinking={isThinking}
      />

      {/* Tool calls */}
      {toolCalls.length > 0 && <ToolCallsList toolCalls={toolCalls} />}

      {/* Text content - matches MessageList styling */}
      {content && (
        <div className="rounded-lg py-3">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown
              components={{
                code({ inline, className, children, ...props }: any) {
                  return (
                    <CodeBlock inline={inline} className={className} {...props}>
                      {String(children).replace(/\n$/, "")}
                    </CodeBlock>
                  );
                },
                p: ({ children }) => (
                  <div className="mb-4 last:mb-0">{children}</div>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-600 dark:text-red-400 mb-2">
                {error.message}
              </p>
              {error.recoverable && (
                <div className="flex gap-2">
                  {onRetry && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onRetry}
                      className="text-xs"
                    >
                      Try Again
                    </Button>
                  )}
                  {onContinue && (
                    <Button size="sm" onClick={onContinue} className="text-xs">
                      Continue
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Typing indicator */}
      {isThinking && !content && toolCalls.length === 0 && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="flex gap-1">
            <span
              className="w-2 h-2 bg-current rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="w-2 h-2 bg-current rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="w-2 h-2 bg-current rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>
      )}

      {/* Building indicator */}
      <div className="flex items-center gap-2 text-sm pt-3 border-t border-border/50">
        <ShinyText text={rotatingMessage} disabled={false} speed={3} />
      </div>
    </div>
  );
}
