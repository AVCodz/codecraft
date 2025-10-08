"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { useChatStore } from "@/lib/stores/chatStore";
import { useMessagesStore } from "@/lib/stores/messagesStore";
import { useProjectStore } from "@/lib/stores/projectStore";
import { ToolCall } from "@/lib/types";
import { cn } from "@/lib/utils/helpers";
import { Bot } from "lucide-react";

interface ChatInterfaceProps {
  projectId: string;
  className?: string;
}

type MessageDocument = {
  $id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string;
  updatedAt?: string;
  $createdAt?: string;
  $updatedAt?: string;
  metadata?: unknown;
};

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
    currentStreamingMessage,
    setCurrentStreamingMessage,
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentStreamingMessage]);

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
      let assistantMessage = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // `toTextStreamResponse` returns a plain text stream, so each chunk
          // is just more assistant text. Use streaming decode to handle
          // multi-byte characters that might span chunks.
          const chunk = decoder.decode(value, { stream: true });
          if (!chunk) continue;

          assistantMessage += chunk;
          setCurrentStreamingMessage(assistantMessage);
        }

        // Flush any remaining buffered text from the decoder.
        const finalChunk = decoder.decode();
        if (finalChunk) {
          assistantMessage += finalChunk;
          setCurrentStreamingMessage(assistantMessage);
        }
      }

      if (!assistantMessage) {
        console.warn("[Chat] No assistant output received from stream.");
        setCurrentStreamingMessage("");
        return;
      }

      const assistantMsg = {
        id: `assistant_${Date.now()}`,
        role: "assistant" as const,
        content: assistantMessage,
        timestamp: new Date(),
      };

      addMessage(assistantMsg);

      // Note: Assistant message is saved by the backend API
      // Sync messages and files from Appwrite to LocalDB after conversation
      try {
        const authResult = await import("@/lib/appwrite/auth").then((m) =>
          m.clientAuth.getCurrentUser()
        );
        if (authResult.success && authResult.user) {
          // Sync messages to LocalDB
          await syncMessagesWithAppwrite(projectId, authResult.user.$id);

          // Reload messages into chatStore
          const updatedMessages = getPersistentMessages(projectId);
          const formattedMessages = updatedMessages.map((doc) => {
            const metadata = parseMetadata(doc.metadata);
            return {
              id: doc.$id,
              role: doc.role,
              content: doc.content,
              timestamp: new Date(doc.$createdAt || Date.now()),
              toolCalls: metadata?.toolCalls,
            };
          });
          setMessages(formattedMessages);
        }

        // Refresh files to reflect any changes made during the conversation
        await refreshFiles(projectId);
      } catch (err) {
        console.error("Failed to sync after conversation:", err);
      }

      setCurrentStreamingMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
      setStreaming(false);
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">AI Assistant</h2>
            {currentProject && (
              <p className="text-sm text-muted-foreground">
                Working on: {currentProject.title}
              </p>
            )}
          </div>
          {error && (
            <div className="text-sm text-destructive">Error: {error}</div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
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
            {currentStreamingMessage && (
              <div className="flex gap-3 p-4 space-y-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg max-w-[80%]">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{currentStreamingMessage}</ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 p-4 border-t border-border">
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
