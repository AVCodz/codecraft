/**
 * STREAMING TYPES - Types for structured streaming from AI API
 *
 * Purpose: Define message types for streaming AI responses with tool calls and status
 * Used by: Chat API route, ChatInterface component
 * Key Features: Structured streaming with text, tool calls, status, and errors
 */

export type StreamMessageType =
  | "thinking-start"
  | "thinking-end"
  | "text"
  | "tool-call"
  | "tool-call-preview"
  | "tool-call-building"
  | "status"
  | "error"
  | "done";

export interface ThinkingStartMessage {
  type: "thinking-start";
  timestamp: number;
}

export interface ThinkingEndMessage {
  type: "thinking-end";
  duration: number; // in seconds
}

export interface TextMessage {
  type: "text";
  content: string;
}

export interface ToolCallMessage {
  type: "tool-call";
  id: string;
  name: string;
  status: "start" | "complete" | "error";
  args?: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

export interface ToolCallPreviewMessage {
  type: "tool-call-preview";
  id: string;
  name: string;
  status: "planned";
  args?: Record<string, unknown>;
}

export interface ToolCallBuildingMessage {
  type: "tool-call-building";
  id: string;
  name: string;
  status: "building";
  args?: Record<string, unknown>;
  progress?: {
    nameComplete: boolean;
    argsComplete: boolean;
    argsLength: number;
  };
}

export interface StatusMessage {
  type: "status";
  status: "analyzing" | "executing" | "processing";
  message?: string;
}

export interface ErrorMessage {
  type: "error";
  error: string;
  recoverable: boolean;
  toolCallId?: string;
}

export interface DoneMessage {
  type: "done";
}

export type StreamMessage =
  | ThinkingStartMessage
  | ThinkingEndMessage
  | TextMessage
  | ToolCallMessage
  | ToolCallPreviewMessage
  | ToolCallBuildingMessage
  | StatusMessage
  | ErrorMessage
  | DoneMessage;

// Helper to encode stream message
export function encodeStreamMessage(message: StreamMessage): string {
  return JSON.stringify(message) + "\n";
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
  status: "planned" | "building" | "in-progress" | "completed" | "error";
  args?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  startTime: number;
  endTime?: number;
  progress?: {
    nameComplete: boolean;
    argsComplete: boolean;
    argsLength: number;
  };
}
