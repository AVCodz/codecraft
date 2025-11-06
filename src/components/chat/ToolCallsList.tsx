/**
 * ToolCallsList - Display tool calls with Lovable-style UI
 * Shows file operations with status (Editing/Edited)
 */
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileEdit,
  FileCheck,
  FileX,
  ChevronDown,
  ChevronRight,
  Clock,
  Wrench,
} from "lucide-react";
import { ToolCallState } from "@/lib/types/streaming";
import { cn } from "@/lib/utils/helpers";
import { CiCircleCheck } from "react-icons/ci";
import { FaListUl } from "react-icons/fa6";

interface ToolCallsListProps {
  toolCalls: ToolCallState[];
  className?: string;
}

export function ToolCallsList({ toolCalls, className }: ToolCallsListProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (toolCalls.length === 0) return null;

  const completedCount = toolCalls.filter(
    (tc) => tc.status === "completed"
  ).length;
  const inProgressCount = toolCalls.filter(
    (tc) => tc.status === "in-progress"
  ).length;
  const errorCount = toolCalls.filter((tc) => tc.status === "error").length;
  const plannedCount = toolCalls.filter((tc) => tc.status === "planned").length;
  const buildingCount = toolCalls.filter(
    (tc) => tc.status === "building"
  ).length;

  return (
    <div
      className={cn("border border-border rounded-lg bg-muted/30", className)}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center  ">
          <div className="flex items-center gap-2">
            <FaListUl className="h-3.5 w-3.5" />
            <span className="text-sm font-medium">Plan</span>
          </div>
        </div>

        <div className="flex gap-2 items-center text-sm">
          {plannedCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-yellow-500" />
              {plannedCount} planned
            </span>
          )}
          {buildingCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
              {buildingCount} building
            </span>
          )}
          {inProgressCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              {inProgressCount} in progress
            </span>
          )}
          {/* {completedCount > 0 && <span>{completedCount} completed</span>} */}
          {errorCount > 0 && (
            <span className="text-red-500">{errorCount} failed</span>
          )}

          <motion.div
            animate={{ rotate: isExpanded ? 0 : -90 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </div>
      </button>

      {/* Tool calls list */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border p-3 space-y-2">
              {toolCalls.map((toolCall, index) => (
                <motion.div
                  key={toolCall.id || `tool-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.1, delay: index * 0.03 }}
                >
                  <ToolCallItem toolCall={toolCall} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ToolCallItemProps {
  toolCall: ToolCallState;
}

function ToolCallItem({ toolCall }: ToolCallItemProps) {
  const getIcon = () => {
    if (toolCall.status === "planned") {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    }
    if (toolCall.status === "building") {
      return <Wrench className="h-4 w-4 text-orange-500 animate-pulse" />;
    }
    if (toolCall.status === "in-progress") {
      return <FileEdit className="h-4 w-4 text-blue-500 animate-pulse" />;
    }
    if (toolCall.status === "error") {
      return <FileX className="h-4 w-4 text-red-500" />;
    }
    return <CiCircleCheck className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (toolCall.status === "planned") return "Planned";
    if (toolCall.status === "building") return "Building";
    if (toolCall.status === "error") return "Failed";

    if (toolCall.status === "in-progress") {
      if (toolCall.name === "read_file") return "Reading";
      if (toolCall.name === "create_file") return "Creating";
      if (toolCall.name === "update_file") return "Updating";
      if (toolCall.name === "delete_file") return "Deleting";
      if (toolCall.name === "list_project_files") return "Listing files";
      if (toolCall.name === "search_files") return "Searching files";
      if (toolCall.name === "find_in_files") return "Searching in files";
      return "Editing";
    }

    if (toolCall.name === "read_file") return "Read";
    if (toolCall.name === "create_file") return "Created";
    if (toolCall.name === "update_file") return "Updated";
    if (toolCall.name === "delete_file") return "Deleted";
    if (toolCall.name === "list_project_files") return "Listed files";
    if (toolCall.name === "search_files") return "Searched files";
    if (toolCall.name === "find_in_files") return "Searched in files";

    return "Completed";
  };

  const getFileName = () => {
    if (toolCall.name === "list_project_files") {
      const result = toolCall.result as any;
      if (result?.files) {
        const fileCount = Array.isArray(result.files) ? result.files.length : 0;
        return `${fileCount} files`;
      }
      return "";
    }

    if (toolCall.name === "search_files") {
      const query = toolCall.args?.query || toolCall.args?.pattern;
      return query ? `"${query}"` : "";
    }

    if (toolCall.name === "find_in_files") {
      const query = toolCall.args?.query || toolCall.args?.pattern;
      return query ? `"${query}"` : "";
    }

    if (toolCall.args?.path) {
      return String(toolCall.args.path);
    }
    return toolCall.name;
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2  rounded-md text-sm transition-colors"
      )}
    >
      {getIcon()}
      <span
        className={cn(
          "font-medium"
          // toolCall.status === "planned" &&
          //   "text-yellow-600 dark:text-yellow-400",
          // toolCall.status === "building" &&
          //   "text-orange-600 dark:text-orange-400",
          // toolCall.status === "in-progress" &&
          //   "text-blue-600 dark:text-blue-400",
          // toolCall.status === "completed" &&
          //   "text-green-600 dark:text-green-400",
          // toolCall.status === "error" && "text-red-600 dark:text-red-400"
        )}
      >
        {getStatusText()}
      </span>
      <span className="text-muted-foreground truncate flex-1">
        {getFileName()}
      </span>
      {toolCall.status === "building" && toolCall.progress && (
        <span className="text-xs text-orange-500">
          {toolCall.progress.argsLength > 0 &&
            `${toolCall.progress.argsLength} chars`}
        </span>
      )}
      {toolCall.error && (
        <span
          className="text-xs text-red-500 truncate max-w-[200px]"
          title={toolCall.error}
        >
          {toolCall.error}
        </span>
      )}
    </div>
  );
}
