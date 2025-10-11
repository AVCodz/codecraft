/**
 * MessageInput - Chat message input component with fixed height
 * Handles user text input with keyboard shortcuts and submission
 * Features: Fixed height (h-32), modern scrollbar, Enter to send, Shift+Enter for new line
 * Used in: ChatInterface for user message composition
 */
"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils/helpers";

interface MessageInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  disabled,
  placeholder = "Type your message...",
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || isLoading || disabled) return;
    onSubmit(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex items-end gap-2 rounded-xl overflow-hidden border border-border bg-muted/30 px-4 py-3"
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "flex-1 resize-none bg-transparent text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 h-32 overflow-y-auto scrollbar-modern"
        )}
      />

      <Button
        type="submit"
        size="icon"
        disabled={!value.trim() || isLoading || disabled}
        className="h-10 w-10 rounded-full flex-shrink-0"
      >
        {isLoading ? (
          <Square className="h-4 w-4" />
        ) : (
          <ArrowUp className="h-4 w-4" />
        )}
      </Button>
    </form>
  );
}
