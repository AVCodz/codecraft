"use client";

import { useState, useRef, useEffect } from "react";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { useChatStore } from "@/lib/stores/chatStore";
import { useProjectStore } from "@/lib/stores/projectStore";
import { ToolCall } from "@/lib/types";
import { cn } from "@/lib/utils/helpers";

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

type RunCommandResult = {
  success: boolean;
  command?: string;
  args?: string[];
  exitCode: number | null;
  timedOut?: boolean;
  stdout?: string;
  stderr?: string;
  error?: string;
};

type WindowWithTerminal = Window & {
  terminalWrite?: (
    message: string,
    type?: "info" | "success" | "error" | "warning"
  ) => void;
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
  const {
    messages,
    setMessages,
    addMessage,
    updateMessage,
    setStreaming,
    currentStreamingMessage,
    setCurrentStreamingMessage,
    clearMessages,
  } = useChatStore();

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentStreamingMessage]);

  useEffect(() => {
    let isActive = true;

    const loadChatHistory = async () => {
      if (!projectId) {
        clearMessages();
        return;
      }

      try {
        const authResult = await import("@/lib/appwrite/auth").then((m) =>
          m.clientAuth.getCurrentUser()
        );
        if (!authResult.success || !authResult.user) {
          clearMessages();
          return;
        }

        const { createClientSideClient, DATABASE_ID, COLLECTIONS } =
          await import("@/lib/appwrite/config");
        const { Query } = await import("appwrite");
        const { databases } = createClientSideClient();

        const response = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.MESSAGES,
          [
            Query.equal("projectId", projectId),
            Query.orderAsc("sequence"),
            Query.limit(200),
          ]
        );

        if (!isActive) return;

        const history = response.documents.map((doc) => {
          const typedDoc = doc as unknown as MessageDocument;
          const metadata = parseMetadata(typedDoc.metadata);
          return {
            id: typedDoc.$id,
            role: typedDoc.role,
            content: typedDoc.content,
            timestamp: new Date(
              typedDoc.createdAt ||
                typedDoc.$createdAt ||
                typedDoc.updatedAt ||
                typedDoc.$updatedAt ||
                Date.now()
            ),
            toolCalls: metadata?.toolCalls,
          };
        });

        setMessages((prev) => {
          if (prev.length === 0) {
            return history;
          }

          const historyIds = new Set(history.map((msg) => msg.id));
          const merged = [...history];

          for (const msg of prev) {
            if (!historyIds.has(msg.id)) {
              merged.push({
                ...msg,
                toolCalls: msg.toolCalls || undefined,
              });
            }
          }

          return merged;
        });
      } catch (err) {
        console.error("Failed to load chat history:", err);
      }
    };

    loadChatHistory();

    return () => {
      isActive = false;
      clearMessages();
      setCurrentStreamingMessage("");
    };
  }, [projectId, setMessages, clearMessages, setCurrentStreamingMessage]);

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

      // Save user message to Appwrite
      const { createClientSideClient } = await import("@/lib/appwrite/config");
      const { DATABASE_ID, COLLECTIONS } = await import(
        "@/lib/appwrite/config"
      );
      const { ID } = await import("appwrite");
      const { databases } = createClientSideClient();
      const now = new Date().toISOString();

      try {
        const savedUserMessage = await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.MESSAGES,
          ID.unique(),
          {
            projectId,
            userId: authResult.user.$id,
            role: "user",
            content: input,
            sequence: messages.length,
            createdAt: now,
            updatedAt: now,
          }
        );

        if (savedUserMessage) {
          updateMessage(userMessage.id, {
            id: savedUserMessage.$id,
            timestamp: new Date(
              savedUserMessage.createdAt ||
                savedUserMessage.$createdAt ||
                savedUserMessage.updatedAt ||
                savedUserMessage.$updatedAt ||
                now
            ),
          });
        }
      } catch (err) {
        console.error("Failed to save user message:", err);
      }

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

      // Save assistant message to Appwrite
      try {
        const { createClientSideClient } = await import(
          "@/lib/appwrite/config"
        );
        const { DATABASE_ID, COLLECTIONS } = await import(
          "@/lib/appwrite/config"
        );
        const { ID } = await import("appwrite");
        const { databases } = createClientSideClient();
        const now = new Date().toISOString();

        const authResult = await import("@/lib/appwrite/auth").then((m) =>
          m.clientAuth.getCurrentUser()
        );
        if (authResult.success && authResult.user) {
          const savedAssistantMessage = await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.MESSAGES,
            ID.unique(),
            {
              projectId,
              userId: authResult.user.$id,
              role: "assistant",
              content: assistantMessage,
              sequence: messages.length + 1,
              createdAt: now,
              updatedAt: now,
            }
          );

          if (savedAssistantMessage) {
            const metadata = parseMetadata(savedAssistantMessage.metadata);
            updateMessage(assistantMsg.id, {
              id: savedAssistantMessage.$id,
              timestamp: new Date(
                savedAssistantMessage.createdAt ||
                  savedAssistantMessage.$createdAt ||
                  savedAssistantMessage.updatedAt ||
                  savedAssistantMessage.$updatedAt ||
                  now
              ),
              toolCalls: metadata?.toolCalls,
            });

            const executedToolCalls = metadata?.toolCalls ?? [];
            executedToolCalls
              .filter((tool) => tool.name === "run_command")
              .forEach((tool) => {
                const write = (window as WindowWithTerminal).terminalWrite;
                if (typeof write === "function") {
                  const toolArgs = tool.arguments || {};
                  const outcome = (tool.result ?? {}) as RunCommandResult;
                  const commandSummary = [
                    outcome.command || toolArgs.command || tool.name,
                    ...(Array.isArray(outcome.args) ? outcome.args : []),
                  ]
                    .filter(Boolean)
                    .join(" ");

                  write(
                    `Executed ${commandSummary}`.trim(),
                    outcome.success ? "success" : "error"
                  );

                  if (outcome.stdout) {
                    write(outcome.stdout.trim(), "info");
                  }
                  if (outcome.stderr) {
                    write(outcome.stderr.trim(), "warning");
                  }
                }
              });
          }
        }
      } catch (err) {
        console.error("Failed to save assistant message:", err);
      }

      try {
        await refreshFiles(projectId);
      } catch (err) {
        console.error("Failed to refresh project files:", err);
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
        <MessageList
          messages={messages}
          isLoading={isLoading}
          onRegenerate={() => {}}
          onStop={() => setIsLoading(false)}
        />
        {currentStreamingMessage && (
          <div className="p-4 bg-muted/50">
            <div className="prose prose-sm max-w-none">
              {currentStreamingMessage}
            </div>
          </div>
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
