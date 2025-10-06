"use client";

import { ChatMessage } from "@/lib/types";
import { StreamingMessage } from "./StreamingMessage";
import { Button } from "@/components/ui/Button";
import { RefreshCw, Square, User, Bot } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/helpers";
import { cn } from "@/lib/utils/helpers";

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onRegenerate: () => void;
  onStop: () => void;
}

export function MessageList({
  messages,
  isLoading,
  onRegenerate,
  onStop,
}: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
          <p className="text-muted-foreground">
            Describe what you want to build and I'll help you create it step by
            step.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {messages.map((message, index) => {
        const isUser = message.role === "user";
        const isLast = index === messages.length - 1;
        const timestamp =
          "timestamp" in message ? message.timestamp : new Date();

        return (
          <div
            key={message.id || index}
            className={cn(
              "flex gap-3",
              isUser ? "justify-end" : "justify-start"
            )}
          >
            {!isUser && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              </div>
            )}

            <div
              className={cn(
                "max-w-[80%] rounded-lg px-4 py-3",
                isUser ? "bg-primary text-primary-foreground" : "bg-muted"
              )}
            >
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {isLast && !isUser && isLoading ? (
                  <StreamingMessage content={message.content} />
                ) : (
                  <div className="whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                )}
              </div>

              {/* Tool calls */}
              {"toolCalls" in message &&
                message.toolCalls &&
                message.toolCalls.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.toolCalls.map((toolCall: any, tcIndex: number) => {
                      const isRunCommand = toolCall.name === "run_command";
                      const commandSummary = isRunCommand
                        ? `${
                            toolCall.result?.command ||
                            toolCall.arguments?.command ||
                            "command"
                          }${
                            toolCall.result?.args
                              ? ` ${toolCall.result.args.join(" ")}`
                              : ""
                          }`
                        : undefined;

                      return (
                        <div
                          key={tcIndex}
                          className="text-xs bg-background/50 rounded p-2 border space-y-2"
                        >
                          <div className="font-medium flex items-center gap-2">
                            <span>🔧 {toolCall.name}</span>
                            {isRunCommand && toolCall.result && (
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full border",
                                  toolCall.result.success
                                    ? "border-green-600 text-green-600"
                                    : "border-red-600 text-red-600"
                                )}
                              >
                                {toolCall.result.success ? "success" : "failed"}
                              </span>
                            )}
                          </div>

                          {isRunCommand && commandSummary && (
                            <div className="font-medium text-muted-foreground">
                              {commandSummary}
                            </div>
                          )}

                          {isRunCommand && toolCall.result?.stdout && (
                            <pre className="bg-muted rounded p-2 whitespace-pre-wrap text-xs">
                              {toolCall.result.stdout.trim()}
                            </pre>
                          )}

                          {isRunCommand && toolCall.result?.stderr && (
                            <pre className="bg-muted/70 rounded p-2 whitespace-pre-wrap text-xs text-destructive">
                              {toolCall.result.stderr.trim()}
                            </pre>
                          )}

                          {isRunCommand &&
                            typeof toolCall.result?.exitCode === "number" && (
                              <div className="text-muted-foreground">
                                Exit code: {toolCall.result.exitCode}
                              </div>
                            )}

                          {isRunCommand && toolCall.result?.timedOut && (
                            <div className="text-warning">
                              Command timed out
                            </div>
                          )}

                          {!isRunCommand && toolCall.result && (
                            <div className="text-muted-foreground">
                              {typeof toolCall.result === "string"
                                ? toolCall.result
                                : JSON.stringify(toolCall.result, null, 2)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

              <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                <span>{formatRelativeTime(timestamp)}</span>

                {!isUser && isLast && (
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
              </div>
            </div>

            {isUser && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
