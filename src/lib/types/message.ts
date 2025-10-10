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
}
