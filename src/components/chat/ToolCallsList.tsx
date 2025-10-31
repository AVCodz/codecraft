/**
 * ToolCallsList - Display tool calls with Lovable-style UI
 * Shows file operations with status (Editing/Edited)
 */
"use client";

import { useState } from "react";
import { FileEdit, FileCheck, FileX, ChevronDown, ChevronRight } from "lucide-react";
import { ToolCallState } from "@/lib/types/streaming";
import { cn } from "@/lib/utils/helpers";

interface ToolCallsListProps {
  toolCalls: ToolCallState[];
  className?: string;
}

export function ToolCallsList({ toolCalls, className }: ToolCallsListProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (toolCalls.length === 0) return null;

  const completedCount = toolCalls.filter(tc => tc.status === 'completed').length;
  const inProgressCount = toolCalls.filter(tc => tc.status === 'in-progress').length;
  const errorCount = toolCalls.filter(tc => tc.status === 'error').length;

  return (
    <div className={cn("border border-border rounded-lg bg-muted/30", className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">
            Let me build this for you:
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {inProgressCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              {inProgressCount} in progress
            </span>
          )}
          {completedCount > 0 && (
            <span>{completedCount} completed</span>
          )}
          {errorCount > 0 && (
            <span className="text-red-500">{errorCount} failed</span>
          )}
        </div>
      </button>

      {/* Tool calls list */}
      {isExpanded && (
        <div className="border-t border-border p-3 space-y-2">
          {toolCalls.map((toolCall, index) => (
            <ToolCallItem key={toolCall.id || `tool-${index}`} toolCall={toolCall} />
          ))}
        </div>
      )}
    </div>
  );
}

interface ToolCallItemProps {
  toolCall: ToolCallState;
}

function ToolCallItem({ toolCall }: ToolCallItemProps) {
  const getIcon = () => {
    if (toolCall.status === 'in-progress') {
      return <FileEdit className="h-4 w-4 text-blue-500 animate-pulse" />;
    }
    if (toolCall.status === 'error') {
      return <FileX className="h-4 w-4 text-red-500" />;
    }
    return <FileCheck className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (toolCall.status === 'in-progress') return 'Editing';
    if (toolCall.status === 'error') return 'Failed';
    return 'Edited';
  };

  const getFileName = () => {
    // Extract filename from args
    if (toolCall.args?.path) {
      return String(toolCall.args.path);
    }
    return toolCall.name;
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
        toolCall.status === 'in-progress' && "bg-blue-500/10",
        toolCall.status === 'completed' && "bg-green-500/10",
        toolCall.status === 'error' && "bg-red-500/10"
      )}
    >
      {getIcon()}
      <span
        className={cn(
          "font-medium",
          toolCall.status === 'in-progress' && "text-blue-600 dark:text-blue-400",
          toolCall.status === 'completed' && "text-green-600 dark:text-green-400",
          toolCall.status === 'error' && "text-red-600 dark:text-red-400"
        )}
      >
        {getStatusText()}
      </span>
      <span className="text-muted-foreground truncate flex-1">
        {getFileName()}
      </span>
      {toolCall.error && (
        <span className="text-xs text-red-500 truncate max-w-[200px]" title={toolCall.error}>
          {toolCall.error}
        </span>
      )}
    </div>
  );
}

