/**
 * MESSAGE TYPE DEFINITIONS - Types for AI chat messages and tool calls
 *
 * Purpose: Define message structures for chat interface and Appwrite storage
 * Used by: Chat interface, message store, AI tool execution
 * Key Features: Message (Appwrite), ChatMessage (UI), ToolCall metadata, File attachments
 */

export interface FileAttachment {
  name: string;
  contentType: string;
  url: string;
  size: number;
  textContent?: string;
}

export interface Message {
  $id: string;
  projectId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: string | {
    model?: string;
    tokens?: number;
    duration?: number;
    durationMs?: number;
    toolCalls?: ToolCall[];
    iterations?: number;
    attachments?: FileAttachment[];
  };
  sequence: number;
  $createdAt: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

export interface CreateMessageData {
  projectId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Message['metadata'];
  sequence: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  toolCalls?: ToolCall[];
  attachments?: FileAttachment[];
}
