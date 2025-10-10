import { create } from 'zustand';
import { ChatMessage, ToolCall } from '@/lib/types';

type SetMessagesInput =
  | ChatMessage[]
  | ((prevMessages: ChatMessage[]) => ChatMessage[]);

interface ChatStore {
  // Chat state
  messages: ChatMessage[];
  isStreaming: boolean;
  isLoading: boolean;
  currentStreamingMessage: string;
  
  // Actions
  setMessages: (messages: SetMessagesInput) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  setStreaming: (streaming: boolean) => void;
  setLoading: (loading: boolean) => void;
  setCurrentStreamingMessage: (content: string) => void;
  clearMessages: () => void;
  regenerateLastMessage: () => void;
  addToolCall: (messageId: string, toolCall: ToolCall) => void;
  updateToolCall: (messageId: string, toolCallId: string, result: unknown) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  // Initial state
  messages: [],
  isStreaming: false,
  isLoading: false,
  currentStreamingMessage: '',

  // Actions
  setMessages: (messages) => {
    if (typeof messages === 'function') {
      set({ messages: messages(get().messages) });
    } else {
      set({ messages });
    }
  },

  addMessage: (message) => {
    const { messages } = get();
    set({ messages: [...messages, message] });
  },

  updateMessage: (id, updates) => {
    const { messages } = get();
    const updatedMessages = messages.map(msg =>
      msg.id === id ? { ...msg, ...updates } : msg
    );
    set({ messages: updatedMessages });
  },

  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setLoading: (loading) => set({ isLoading: loading }),
  setCurrentStreamingMessage: (content) => set({ currentStreamingMessage: content }),

  clearMessages: () => set({ messages: [] }),

  regenerateLastMessage: () => {
    const { messages } = get();
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        // Remove the last assistant message to regenerate it
        set({ messages: messages.slice(0, -1) });
      }
    }
  },

  addToolCall: (messageId, toolCall) => {
    const { messages } = get();
    const updatedMessages = messages.map(msg => {
      if (msg.id === messageId) {
        return {
          ...msg,
          toolCalls: [...(msg.toolCalls || []), toolCall]
        };
      }
      return msg;
    });
    set({ messages: updatedMessages });
  },

  updateToolCall: (messageId, toolCallId, result) => {
    const { messages } = get();
    const updatedMessages = messages.map(msg => {
      if (msg.id === messageId && msg.toolCalls) {
        const updatedToolCalls = msg.toolCalls.map(tc =>
          tc.id === toolCallId ? { ...tc, result } : tc
        );
        return { ...msg, toolCalls: updatedToolCalls };
      }
      return msg;
    });
    set({ messages: updatedMessages });
  },
}));

// Helper function to create a new message
export function createChatMessage(
  role: 'user' | 'assistant' | 'system',
  content: string,
  toolCalls?: ToolCall[]
): ChatMessage {
  return {
    id: generateMessageId(),
    role,
    content,
    timestamp: new Date(),
    toolCalls,
  };
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
