"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface StreamingMessageProps {
  content: string;
}

export function StreamingMessage({ content }: StreamingMessageProps) {
  const [displayedContent, setDisplayedContent] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  // Simulate streaming effect so markdown updates progressively
  useEffect(() => {
    if (!content) {
      setDisplayedContent("");
      return;
    }

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < content.length) {
        setDisplayedContent(content.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [content]);

  // Cursor blinking effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);

    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <div className="flex items-start gap-1">
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown>{displayedContent || " "}</ReactMarkdown>
      </div>
      {showCursor && (
        <span className="mt-1 inline-block h-4 w-1 bg-current animate-pulse" />
      )}
    </div>
  );
}
