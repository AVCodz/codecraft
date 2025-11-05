/**
 * StreamingAssistantMessage - Complete assistant message with thinking, tool calls, and content
 * Combines all streaming elements into a cohesive UI
 */
"use client";

import ReactMarkdown from "react-markdown";
import { Bot, AlertCircle } from "lucide-react";
import { ToolCallsList } from "./ToolCallsList";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { ToolCallState } from "@/lib/types/streaming";
import { Button } from "@/components/ui/Button";
import { CodeBlock } from "./CodeBlock";

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
  return (
    <div className="flex gap-3 p-4">
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-3 max-w-[80%]">
        {/* Thinking indicator */}
        <ThinkingIndicator
          startTime={thinkingStartTime}
          endTime={thinkingEndTime}
          isThinking={isThinking}
        />

        {/* Tool calls */}
        {toolCalls.length > 0 && <ToolCallsList toolCalls={toolCalls} />}

        {/* Text content */}
        {content && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown
                components={{
                  code({ inline, className, children, ...props }: any) {
                    return (
                      <CodeBlock
                        inline={inline}
                        className={className}
                        {...props}
                      >
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
                      <Button
                        size="sm"
                        onClick={onContinue}
                        className="text-xs"
                      >
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

        {/* Building indicator - shown at the bottom throughout the entire streaming process */}
        <div className="flex items-center gap-2 text-muted-foreground text-sm p-3 border-t border-border/50">
          <span>Building response...</span>
        </div>
      </div>
    </div>
  );
}
