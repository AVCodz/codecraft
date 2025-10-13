/**
 * ChatInterface - Main chat component for AI conversations
 * Manages chat state, message streaming, and real-time updates with AI assistant
 * Features: Message history, streaming responses, auto-scroll, LocalDB persistence
 * Used in: Project page for AI-powered code generation and assistance
 */
"use client";

import { useState, useRef, useEffect } from "react";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { StreamingAssistantMessage } from "./StreamingAssistantMessage";
import { useChatStore } from "@/lib/stores/chatStore";
import { useMessagesStore } from "@/lib/stores/messagesStore";
import { useProjectStore } from "@/lib/stores/projectStore";
import { ToolCall } from "@/lib/types";
import { cn } from "@/lib/utils/helpers";
import { parseStreamMessage } from "@/lib/types/streaming";
import type { ToolCallState } from "@/lib/types/streaming";

interface ChatInterfaceProps {
  projectId: string;
  className?: string;
}

function parseMetadata(
  metadata: unknown
): { toolCalls?: ToolCall[] } | undefined {
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
    return metadata as { toolCalls?: ToolCall[] };
  }
  return undefined;
}

export function ChatInterface({ projectId, className }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentProject = useProjectStore((state) => state.currentProject);
  const refreshFiles = useProjectStore((state) => state.refreshFiles);

  // Use both stores - chatStore for UI state, messagesStore for persistence
  const {
    messages,
    setMessages,
    addMessage,
    setStreaming,
    clearMessages,
  } = useChatStore();

  const {
    getMessages: getPersistentMessages,
    loadFromLocalDB: loadMessagesFromLocalDB,
    syncWithAppwrite: syncMessagesWithAppwrite,
    messagesByProject,
  } = useMessagesStore();

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLoadingProjectId, setCurrentLoadingProjectId] =
    useState<string>("");

  // Streaming state
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingToolCalls, setStreamingToolCalls] = useState<ToolCallState[]>([]);
  const [thinkingStartTime, setThinkingStartTime] = useState<number | undefined>();
  const [thinkingEndTime, setThinkingEndTime] = useState<number | undefined>();
  const [isThinking, setIsThinking] = useState(false);
  const [streamingError, setStreamingError] = useState<{
    message: string;
    recoverable: boolean;
  } | undefined>();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, streamingToolCalls]);

  // Watch for changes in messagesByProject for current project
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
      };
    });

    // Only update if we have messages or if messages changed
    if (history.length > 0 || messages.length > 0) {
      setMessages(history);
    }
  }, [messagesByProject, projectId]);

  useEffect(() => {
    let isActive = true;

    const loadChatHistory = async () => {
      if (!projectId) {
        clearMessages();
        setCurrentLoadingProjectId("");
        setIsLoadingMessages(false);
        return;
      }

      // Only clear and reload if it's a different project
      if (currentLoadingProjectId !== projectId) {
        setCurrentLoadingProjectId(projectId);
        setIsLoadingMessages(true);

        // Clear messages immediately to prevent showing old project's messages
        clearMessages();

        // Clear any streaming state when loading new project
        setStreamingContent("");
        setStreamingToolCalls([]);
        setThinkingStartTime(undefined);
        setThinkingEndTime(undefined);
        setIsThinking(false);
        setStreamingError(undefined);

        try {
          // Load from messagesStore (which loads from LocalDB first)
          loadMessagesFromLocalDB(projectId);

          if (!isActive) return;

          // Get the messages for THIS specific project
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
            };
          });

          setMessages(history);
          setIsLoadingMessages(false);

          // Sync with Appwrite in background without blocking UI
          const syncInBackground = async () => {
            try {
              const authResult = await import("@/lib/appwrite/auth").then((m) =>
                m.clientAuth.getCurrentUser()
              );
              if (authResult.success && authResult.user) {
                await syncMessagesWithAppwrite(projectId, authResult.user.$id);
              }
            } catch (err) {
              console.error("Background sync failed:", err);
            }
          };
          syncInBackground();
        } catch (err) {
          console.error("Failed to load chat history:", err);
          setIsLoadingMessages(false);
        }
      }
    };

    loadChatHistory();

    return () => {
      isActive = false;
    };
  }, [projectId, currentLoadingProjectId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: `user_${Date.now()}`,
      role: "user" as const,
      content: input,
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInput("");
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

      // Note: User message is saved by the backend API
      console.log("[ChatInterface] 📤 Sending to API:", {
        projectId,
        userId: authResult.user.$id,
        messageCount: messages.length + 1,
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
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

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
          const lines = buffer.split('\n');
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            const message = parseStreamMessage(line);
            if (!message) continue;

            switch (message.type) {
              case 'thinking-start':
                setThinkingStartTime(message.timestamp);
                setIsThinking(true);
                break;

              case 'thinking-end':
                setThinkingEndTime(Date.now());
                setIsThinking(false);
                break;

              case 'text':
                assistantContent += message.content;
                setStreamingContent(assistantContent);
                break;

              case 'tool-call':
                if (message.status === 'start') {
                  const toolCall: ToolCallState = {
                    id: message.id,
                    name: message.name,
                    status: 'in-progress',
                    args: message.args,
                    startTime: Date.now(),
                  };
                  toolCallsMap.set(message.id, toolCall);
                } else {
                  const existing = toolCallsMap.get(message.id);
                  if (existing) {
                    existing.status = message.status === 'complete' ? 'completed' : 'error';
                    existing.endTime = Date.now();
                    existing.result = message.result;
                    existing.error = message.error;
                  }
                }
                setStreamingToolCalls(Array.from(toolCallsMap.values()));
                break;

              case 'error':
                setStreamingError({
                  message: message.error,
                  recoverable: message.recoverable,
                });
                break;

              case 'done':
                // Stream complete
                break;
            }
          }
        }

        // Process any remaining buffer
        const finalChunk = decoder.decode();
        if (finalChunk) {
          buffer += finalChunk;
          const message = parseStreamMessage(buffer);
          if (message && message.type === 'text') {
            assistantContent += message.content;
            setStreamingContent(assistantContent);
          }
        }
      }

      if (!assistantContent && streamingToolCalls.length === 0) {
        console.warn("[Chat] No assistant output received from stream.");
        return;
      }

      // Create the assistant message with tool calls
      const assistantMsg = {
        id: `assistant_${Date.now()}`,
        role: "assistant" as const,
        content: assistantContent || "Task completed.",
        timestamp: new Date(),
        toolCalls: Array.from(toolCallsMap.values()).map(tc => ({
          id: tc.id,
          name: tc.name,
          arguments: tc.args || {},
          result: tc.result,
        })),
      };

      // Clear streaming state FIRST in a separate render cycle
      setStreamingContent("");
      setStreamingToolCalls([]);
      setThinkingStartTime(undefined);
      setThinkingEndTime(undefined);
      setIsThinking(false);
      setStreamingError(undefined);

      // Add message to list after a tiny delay to ensure streaming UI is cleared
      setTimeout(() => {
        addMessage(assistantMsg);
      }, 50);

      // Refresh files to reflect any changes made during the conversation
      try {
        await refreshFiles(projectId);
      } catch (err) {
        console.error("Failed to refresh files:", err);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
      setStreaming(false);
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex-1 overflow-y-auto scrollbar-modern">
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
            {(streamingContent || streamingToolCalls.length > 0 || isThinking) && (
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
                    const lastUserMsg = messages.filter(m => m.role === 'user').pop();
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

      <div className="flex-shrink-0 p-4 ">
        <MessageInput
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onSubmit={handleSendMessage}
          isLoading={isLoading}
          disabled={!projectId || isLoading}
          placeholder={
            projectId
              ? "Describe what you want to build..."
              : "Select or create a project to start chatting"
          }
        />
      </div>
    </div>
  );
}
