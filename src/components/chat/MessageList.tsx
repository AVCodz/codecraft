/**
 * MessageList - Displays chat message history with formatted content
 * Renders user and assistant messages with markdown support and timestamps
 * Features: Markdown rendering, tool call display, loading states, regeneration
 * Used in: ChatInterface to show conversation history
 */
"use client";

import { ChatMessage } from "@/lib/types";
import React from "react";
import Image from "next/image";
import { StreamingMessage } from "./StreamingMessage";
import { Bot, FileText, Image as ImageIcon, File } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/helpers";
import { cn } from "@/lib/utils/helpers";
import ReactMarkdown from "react-markdown";
import { ToolCallsList } from "./ToolCallsList";
import { CodeBlock } from "./CodeBlock";

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onRegenerate: () => void;
  onStop: () => void;
}

// Helper to get file icon
const getFileIcon = (contentType: string) => {
  if (contentType.startsWith("image/"))
    return <ImageIcon className="h-4 w-4" />;
  if (contentType.includes("pdf") || contentType.includes("document"))
    return <FileText className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
};

// Helper to format file size
const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function MessageListComponent({
  messages,
  isLoading,
}: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
          <p className="text-muted-foreground">
            Describe what you want to build and I&apos;ll help you create it
            step by step.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-7 min-w-0">
      {messages.map((message, index) => {
        const isUser = message.role === "user";
        const isLast = index === messages.length - 1;
        const timestamp =
          "timestamp" in message ? message.timestamp : new Date();

        return (
          <div
            key={message.id || index}
            className={cn(
              "flex gap-3 min-w-0",
              isUser ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "rounded-lg",
                isUser
                  ? "bg-primary text-primary-foreground max-w-[70%] px-4 py-3"
                  : "max-w-[100%] w-full min-w-0 space-y-3"
              )}
            >
              {isUser ? (
                <>
                  <div className="whitespace-pre-wrap break-all">
                    {message.content}
                  </div>

                  {/* Display attachments for user messages */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.attachments.map((attachment, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-primary-foreground/10 rounded px-2 py-1"
                        >
                          {attachment.contentType.startsWith("image/") ? (
                            <div 
                              className="relative w-20 h-20 rounded cursor-pointer" 
                              onClick={() => window.open(attachment.url, "_blank")}
                            >
                              <Image
                                src={attachment.url}
                                alt={attachment.name}
                                fill
                                className="object-cover rounded"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <>
                              {getFileIcon(attachment.contentType)}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">
                                  {attachment.name}
                                </p>
                                <p className="text-xs opacity-70">
                                  {formatFileSize(attachment.size)}
                                  {attachment.textContent &&
                                    " • Text extracted"}
                                </p>
                              </div>
                              <a
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs underline"
                              >
                                View
                              </a>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-end mt-2 text-xs opacity-70">
                    <span>{formatRelativeTime(timestamp)}</span>
                  </div>
                </>
              ) : (
                <>
                  {!isUser && <div className="font-brand text-lg ">VibeIt</div>}
                  {/* Tool calls for assistant messages */}
                  {message.toolCalls && message.toolCalls.length > 0 && (
                    <ToolCallsList
                      toolCalls={message.toolCalls.map((tc) => ({
                        id: tc.id,
                        name: tc.name,
                        status: "completed" as const,
                        args: tc.arguments || (tc as { args?: Record<string, unknown> }).args || {},
                        result: tc.result,
                        startTime: 0,
                        endTime: 0,
                      }))}
                    />
                  )}

                  {/* Text content */}
                  {isLast && isLoading ? (
                    <div className="rounded-lg py-3">
                      <StreamingMessage content={message.content} />
                    </div>
                  ) : (
                    <div className=" rounded-lg  py-3">
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown
                          components={{
                            code: ({
                              inline,
                              className,
                              children,
                              ...props
                            }: React.HTMLAttributes<HTMLElement> & {
                              inline?: boolean;
                            }) => {
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
                            // Fix hydration issues by ensuring proper block/inline element nesting
                            p: ({ children }) => (
                              <div className="mb-4 last:mb-0">{children}</div>
                            ),
                            div: ({ children }) => <div>{children}</div>,
                          }}
                        >
                          {message.content || ""}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {/* <div className="flex items-center justify-between text-xs opacity-70 px-1">
                    <span>{formatRelativeTime(timestamp)}</span>

                    {isLast && (
                      <div className="flex items-center gap-1">
                        {isLoading ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={onStop}
                            className="h-6 px-2"
                          >
                            <Square className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={onRegenerate}
                            className="h-6 px-2"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div> */}
                </>
              )}
            </div>

            {/* {isUser && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
              </div>
            )} */}
          </div>
        );
      })}
    </div>
  );
}

// Memoize to avoid re-rendering the full list on unrelated state changes
export const MessageList = React.memo(MessageListComponent, (prev, next) => {
  if (prev.isLoading !== next.isLoading) return false;
  if (prev.messages.length !== next.messages.length) return false;
  // Compare message identities and core fields
  for (let i = 0; i < prev.messages.length; i++) {
    const a = prev.messages[i];
    const b = next.messages[i];
    if (a.id !== b.id || a.role !== b.role || a.content !== b.content) {
      return false;
    }
  }
  return true;
});
