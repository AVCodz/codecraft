/**
 * ThinkingIndicator - Shows "Thought for X seconds" indicator
 * Displays thinking time like Lovable
 */
"use client";

import { useEffect, useState } from "react";
import { Brain } from "lucide-react";

interface ThinkingIndicatorProps {
  startTime?: number;
  endTime?: number;
  isThinking: boolean;
}

export function ThinkingIndicator({ startTime, endTime, isThinking }: ThinkingIndicatorProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isThinking || !startTime) {
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const seconds = Math.floor((now - startTime) / 1000);
      setElapsed(seconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [isThinking, startTime]);

  useEffect(() => {
    if (endTime && startTime) {
      const seconds = Math.floor((endTime - startTime) / 1000);
      setElapsed(seconds);
    }
  }, [endTime, startTime]);

  if (!startTime) return null;

  const duration = endTime ? Math.floor((endTime - startTime) / 1000) : elapsed;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
      <Brain className="h-3 w-3" />
      <span>
        {isThinking ? (
          <>Thinking for {duration} second{duration !== 1 ? 's' : ''}...</>
        ) : (
          <>Thought for {duration} second{duration !== 1 ? 's' : ''}</>
        )}
      </span>
    </div>
  );
}

