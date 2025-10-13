/**
 * STREAMING TYPES - Types for structured streaming from AI API
 * 
 * Purpose: Define message types for streaming AI responses with tool calls and status
 * Used by: Chat API route, ChatInterface component
 * Key Features: Structured streaming with text, tool calls, status, and errors
 */

export type StreamMessageType = 
  | 'thinking-start'
  | 'thinking-end'
  | 'text'
  | 'tool-call'
  | 'status'
  | 'error'
  | 'done';

export interface ThinkingStartMessage {
  type: 'thinking-start';
  timestamp: number;
}

export interface ThinkingEndMessage {
  type: 'thinking-end';
  duration: number; // in seconds
}

export interface TextMessage {
  type: 'text';
  content: string;
}

export interface ToolCallMessage {
  type: 'tool-call';
  id: string;
  name: string;
  status: 'start' | 'complete' | 'error';
  args?: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

export interface StatusMessage {
  type: 'status';
  status: 'analyzing' | 'executing' | 'processing';
  message?: string;
}

export interface ErrorMessage {
  type: 'error';
  error: string;
  recoverable: boolean;
  toolCallId?: string;
}

export interface DoneMessage {
  type: 'done';
}

export type StreamMessage = 
  | ThinkingStartMessage
  | ThinkingEndMessage
  | TextMessage
  | ToolCallMessage
  | StatusMessage
  | ErrorMessage
  | DoneMessage;

// Helper to encode stream message
export function encodeStreamMessage(message: StreamMessage): string {
  return JSON.stringify(message) + '\n';
}

// Helper to parse stream message
export function parseStreamMessage(line: string): StreamMessage | null {
  try {
    const trimmed = line.trim();
    if (!trimmed) return null;
    return JSON.parse(trimmed) as StreamMessage;
  } catch {
    return null;
  }
}

// UI state for tracking tool calls
export interface ToolCallState {
  id: string;
  name: string;
  status: 'in-progress' | 'completed' | 'error';
  args?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  startTime: number;
  endTime?: number;
}

