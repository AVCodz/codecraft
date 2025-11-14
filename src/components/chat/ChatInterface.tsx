/**
 * ChatInterface - Main chat component for AI conversations
 * Manages chat state, message streaming, and real-time updates with AI assistant
 * Features: Message history, streaming responses, auto-scroll, LocalDB persistence
 * Used in: Project page for AI-powered code generation and assistance
 */
"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { MessageList } from "./MessageList";
import { MessageInput, FileAttachment } from "./MessageInput";
import { StreamingAssistantMessage } from "./StreamingAssistantMessage";
import { useChatStore } from "@/lib/stores/chatStore";
import { useMessagesStore } from "@/lib/stores/messagesStore";
import { useProjectStore } from "@/lib/stores/projectStore";
import { ToolCall } from "@/lib/types";
import { cn } from "@/lib/utils/helpers";
import { parseStreamMessage } from "@/lib/types/streaming";
import type { ToolCallState } from "@/lib/types/streaming";
import { ArrowDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlanModePreference } from "@/lib/hooks/usePlanModePreference";

interface ChatInterfaceProps {
  projectId: string;
  className?: string;
}

function parseMetadata(
  metadata: unknown
): { toolCalls?: ToolCall[]; attachments?: FileAttachment[] } | undefined {
  if (!metadata) return undefined;
  if (typeof metadata === "string") {
    try {
      return JSON.parse(metadata);
    } catch (error) {
      console.error("Failed to parse message metadata", error);
      return undefined;
    }
  }
  if (typeof metadata === "object") {
    return metadata as {
      toolCalls?: ToolCall[];
      attachments?: FileAttachment[];
    };
  }
  return undefined;
}

export function ChatInterface({ projectId, className }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef<number>(0);
  const prevStreamingLengthRef = useRef<number>(0);
  const currentProject = useProjectStore((state) => state.currentProject);
  const refreshFiles = useProjectStore((state) => state.refreshFiles);
  const [hasAutoSent, setHasAutoSent] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Use both stores - chatStore for UI state, messagesStore for persistence
  const { messages, setMessages, setStreaming } = useChatStore();

  const {
    getMessages: getPersistentMessages,
    messagesByProject,
    addOptimisticMessage,
  } = useMessagesStore();

  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isPlanMode, setIsPlanMode] = usePlanModePreference();
  // Derive loading state from persistence store presence for this project
  const isLoadingMessages = useMemo(() => {
    if (!projectId) return false;
    return messagesByProject[projectId] === undefined;
  }, [projectId, messagesByProject]);
  const [, setError] = useState<string | null>(null);

  // Streaming state
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingToolCalls, setStreamingToolCalls] = useState<ToolCallState[]>(
    []
  );
  const [thinkingStartTime, setThinkingStartTime] = useState<
    number | undefined
  >();
  const [thinkingEndTime, setThinkingEndTime] = useState<number | undefined>();
  const [isThinking, setIsThinking] = useState(false);
  const [streamingError, setStreamingError] = useState<
    | {
        message: string;
        recoverable: boolean;
      }
    | undefined
  >();

  // Detect scroll position to show/hide scroll button
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      // Show button if scrolled up more than 200px from bottom
      setShowScrollButton(distanceFromBottom > 200);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Smooth scroll only on new content appended (prevents bounce)
  useEffect(() => {
    let shouldScroll = false;

    // New persisted message appended
    if (messages.length > prevMessageCountRef.current) {
      prevMessageCountRef.current = messages.length;
      shouldScroll = true;
    }

    // Streaming text grew
    if (streamingContent.length > prevStreamingLengthRef.current) {
      prevStreamingLengthRef.current = streamingContent.length;
      shouldScroll = true;
    }

    if (shouldScroll) {
      // Use rAF to avoid layout thrash during render
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [messages.length, streamingContent.length]);

  // Shallow-equality sync from persistence → UI store to prevent full re-renders
  useEffect(() => {
    if (!projectId) return;

    const persistedMessages = getPersistentMessages(projectId);

    // Convert to ChatMessage format
    const history = persistedMessages.map((doc) => {
      const metadata = parseMetadata(doc.metadata);
      return {
        id: doc.$id,
        role: doc.role,
        content: doc.content,
        timestamp: new Date(doc.$createdAt || Date.now()),
        toolCalls: metadata?.toolCalls,
        attachments: metadata?.attachments,
      } as const;
    });

    // Compare by length and stable keys to avoid unnecessary setMessages
    const isEqual = (() => {
      if (history.length !== messages.length) return false;
      for (let i = 0; i < history.length; i++) {
        const a = history[i];
        const b = messages[i];
        if (a.id !== b.id || a.role !== b.role || a.content !== b.content) {
          return false;
        }
        const aAtt = (a.attachments || []).length;
        const bAtt = (b.attachments || []).length;
        if (aAtt !== bAtt) return false;
      }
      return true;
    })();

    if (!isEqual) {
      setMessages(history);
    }
  }, [messagesByProject, projectId, messages]);

  // Reset transient streaming state on project change to avoid carryover flicker
  useEffect(() => {
    setHasAutoSent(false);
    setStreamingContent("");
    setStreamingToolCalls([]);
    setThinkingStartTime(undefined);
    setThinkingEndTime(undefined);
    setIsThinking(false);
    setStreamingError(undefined);
    setAttachments([]);
  }, [projectId]);

  // Auto-send first message to chat API when it appears
  useEffect(() => {
    // Check if we have exactly one user message and no assistant messages
    const userMessages = messages.filter((m) => m.role === "user");
    const assistantMessages = messages.filter((m) => m.role === "assistant");

    if (
      userMessages.length === 1 &&
      assistantMessages.length === 0 &&
      !isLoading &&
      !isLoadingMessages &&
      !hasAutoSent &&
      projectId
    ) {
      console.log("[ChatInterface] Auto-sending first message to chat API");
      setHasAutoSent(true);

      // Call API directly without adding message again (it's already in DB)
      const sendToAPI = async () => {
        setIsLoading(true);
        setStreaming(true);

        try {
          const authResult = await import("@/lib/appwrite/auth").then((m) =>
            m.clientAuth.getCurrentUser()
          );
          if (!authResult.success || !authResult.user) {
            throw new Error("Not authenticated");
          }

          // Gather attachments from the first user message (e.g., landing page)
          const firstUserMessage = userMessages[0];
          const autoAttachments = firstUserMessage?.attachments || [];

          console.log("[ChatInterface] 📤 Auto-sending to API:", {
            projectId,
            userId: authResult.user.$id,
            messageCount: messages.length,
          });

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          projectId,
          userId: authResult.user.$id,
          attachments: autoAttachments,
          planMode: isPlanMode,
        }),
      });

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }

          await handleStreamResponse(response);
        } catch (error) {
          console.error("[ChatInterface] Auto-send error:", error);
          setError(
            error instanceof Error ? error.message : "Failed to send message"
          );
        } finally {
          setIsLoading(false);
          setStreaming(false);
        }
      };

      setTimeout(() => {
        sendToAPI();
      }, 500);
    }
  }, [
    messages,
    isLoading,
    isLoadingMessages,
    hasAutoSent,
    projectId,
    isPlanMode,
  ]);

  // Handle streaming response from API
  const handleStreamResponse = async (response: Response) => {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let assistantContent = "";
    const toolCallsMap = new Map<string, ToolCallState>();

    // Reset streaming state
    setStreamingContent("");
    setStreamingToolCalls([]);
    setThinkingStartTime(undefined);
    setThinkingEndTime(undefined);
    setIsThinking(false);
    setStreamingError(undefined);

    if (reader) {
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          const message = parseStreamMessage(line);
          if (!message) continue;

          switch (message.type) {
            case "thinking-start":
              setThinkingStartTime(message.timestamp);
              setIsThinking(true);
              break;

            case "thinking-end":
              setThinkingEndTime(Date.now());
              setIsThinking(false);
              break;

            case "text":
              assistantContent += message.content;
              setStreamingContent(assistantContent);
              break;

            case "tool-call-preview":
              const previewToolCall: ToolCallState = {
                id: message.id,
                name: message.name,
                status: "planned",
                args: message.args,
                startTime: Date.now(),
              };
              toolCallsMap.set(message.id, previewToolCall);
              setStreamingToolCalls(Array.from(toolCallsMap.values()));
              break;

            case "tool-call-building":
              const existingBuilding = toolCallsMap.get(message.id);
              if (existingBuilding) {
                existingBuilding.status = "building";
                existingBuilding.name = message.name;
                existingBuilding.args = message.args;
                existingBuilding.progress = message.progress;
              } else {
                const buildingToolCall: ToolCallState = {
                  id: message.id,
                  name: message.name,
                  status: "building",
                  args: message.args,
                  startTime: Date.now(),
                  progress: message.progress,
                };
                toolCallsMap.set(message.id, buildingToolCall);
              }
              setStreamingToolCalls(Array.from(toolCallsMap.values()));
              break;

            case "tool-call":
              if (message.status === "start") {
                const existing = toolCallsMap.get(message.id);
                if (existing) {
                  // Update existing tool call to in-progress
                  existing.status = "in-progress";
                  existing.args = message.args;
                } else {
                  // Create new tool call if it doesn't exist
                  const toolCall: ToolCallState = {
                    id: message.id,
                    name: message.name,
                    status: "in-progress",
                    args: message.args,
                    startTime: Date.now(),
                  };
                  toolCallsMap.set(message.id, toolCall);
                }
              } else {
                const existing = toolCallsMap.get(message.id);
                if (existing) {
                  existing.status =
                    message.status === "complete" ? "completed" : "error";
                  existing.endTime = Date.now();
                  existing.result = message.result;
                  existing.error = message.error;
                }
              }
              setStreamingToolCalls(Array.from(toolCallsMap.values()));
              break;

            case "status":
              console.log(
                `[Status] ${message.status}: ${message.message || ""}`
              );
              break;

            case "error":
              console.error("[Stream Error]", message.error);
              setStreamingError({
                message: message.error,
                recoverable: message.recoverable,
              });
              break;

            case "done":
              console.log("[Stream] Complete");
              break;
          }
        }
      }

      // Note: Assistant message is saved by the API and will be synced via realtime
      // No need to add it here to avoid duplicates

      // Refresh files after streaming completes
      if (currentProject?.$id) {
        await refreshFiles(currentProject.$id);
      }
    }
  };

  const handleSendMessage = async (
    e: React.FormEvent,
    message?: string,
    mentionedFiles?: string[]
  ) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const currentAttachments = [...attachments];
    const messageContent = message || input;
    const fileMentions = mentionedFiles || [];
    setInput("");
    setAttachments([]);
    setIsLoading(true);
    setStreaming(true);
    setError(null);

    try {
      const authResult = await import("@/lib/appwrite/auth").then((m) =>
        m.clientAuth.getCurrentUser()
      );
      if (!authResult.success || !authResult.user) {
        throw new Error("Not authenticated");
      }

      // Add optimistic message to messagesStore - appears instantly in UI
      addOptimisticMessage(projectId, {
        projectId,
        userId: authResult.user.$id,
        role: "user" as const,
        content: messageContent,
        sequence: messages.length,
        metadata:
          currentAttachments.length > 0
            ? { attachments: currentAttachments }
            : undefined,
      } as any);

      console.log("[ChatInterface] ⚡ Optimistic message added");

      // Prepare message for API
      const userMessage = {
        id: `user_${Date.now()}`,
        role: "user" as const,
        content: messageContent,
        timestamp: new Date(),
      };

      console.log("[ChatInterface] 📤 Sending to API:", {
        projectId,
        userId: authResult.user.$id,
        messageCount: messages.length + 1,
        attachmentsCount: currentAttachments.length,
      });

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          projectId,
          userId: authResult.user.$id,
          attachments: currentAttachments,
          mentionedFiles: fileMentions,
          planMode: isPlanMode,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      await handleStreamResponse(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
      setStreaming(false);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!input.trim() || isEnhancing) return;

    setIsEnhancing(true);

    try {
      const isFirstMessage = messages.length === 0;
      const projectSummary = currentProject?.summary;

      const response = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: input,
          projectSummary,
          isFirstMessage,
          projectId,
        }),
      });

      if (!response.ok) throw new Error("Failed to enhance prompt");

      const data = await response.json();

      if (data.success && data.enhancedPrompt) {
        setInput(data.enhancedPrompt);
      }
    } catch (error) {
      console.error("Error enhancing prompt:", error);
      alert("Failed to enhance prompt. Please try again.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  };

  return (
    <div className={cn("flex flex-col h-full min-w-0 relative", className)}>
      <div
        ref={scrollContainerRef}
        className="flex-1 min-w-0 overflow-y-auto scrollbar-modern"
      >
        {isLoadingMessages ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading conversation...</p>
            </div>
          </div>
        ) : (
          <>
            <MessageList
              messages={messages}
              isLoading={isLoading}
              onRegenerate={() => {}}
              onStop={() => setIsLoading(false)}
            />
            {/* Only show streaming message if it hasn't been saved to DB yet */}
            {(streamingContent ||
              streamingToolCalls.length > 0 ||
              isThinking) &&
              messages[messages.length - 1]?.role !== "assistant" && (
                <StreamingAssistantMessage
                  content={streamingContent}
                  toolCalls={streamingToolCalls}
                  thinkingStartTime={thinkingStartTime}
                  thinkingEndTime={thinkingEndTime}
                  isThinking={isThinking}
                  error={streamingError}
                  onRetry={() => {
                    // Retry last message
                    if (messages.length > 0) {
                      const lastUserMsg = messages
                        .filter((m) => m.role === "user")
                        .pop();
                      if (lastUserMsg) {
                        setInput(lastUserMsg.content);
                      }
                    }
                  }}
                  onContinue={() => {
                    // Continue despite error
                    setStreamingError(undefined);
                  }}
                />
              )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 p-4 relative">
        {/* Scroll to bottom button - positioned above MessageInput */}
        <AnimatePresence>
          {showScrollButton && messages.length > 0 && !isLoadingMessages && (
            <motion.button
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30,
                opacity: { duration: 0.15 },
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={scrollToBottom}
              className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 z-20 flex items-center justify-center w-7 h-7 rounded-full bg-primary/95 hover:bg-primary shadow-xl backdrop-blur-md border border-primary-foreground/20 transition-colors"
              aria-label="Scroll to bottom"
              title="Scroll to bottom"
            >
              <ArrowDown className="w-4 h-4 text-primary-foreground" />
            </motion.button>
          )}
        </AnimatePresence>

        <MessageInput
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onSubmit={handleSendMessage}
          isLoading={isLoading}
          disabled={!projectId || isLoading}
          placeholder={
            projectId
              ? "Type @ to mention files or describe what you want to build..."
              : "Select or create a project to start chatting"
          }
          attachments={attachments}
          onAttachmentsChange={setAttachments}
          onEnhance={handleEnhancePrompt}
          isEnhancing={isEnhancing}
          isPlanMode={isPlanMode}
          onPlanModeChange={(value) => setIsPlanMode(value)}
        />
      </div>
    </div>
  );
}
