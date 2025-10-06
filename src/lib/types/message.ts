export interface Message {
  $id: string;
  projectId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    model?: string;
    tokens?: number;
    duration?: number;
    toolCalls?: ToolCall[];
  };
  sequence: number;
  $createdAt: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: any;
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
