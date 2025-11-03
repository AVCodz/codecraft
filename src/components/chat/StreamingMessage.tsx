/**
 * StreamingMessage - Real-time AI message streaming display component
 * Shows AI responses as they stream in
 * Features: Markdown rendering, typing indicator
 * Used in: ChatInterface to display live AI responses
 */
"use client";

import { useState, useEffect } from "react";

import ReactMarkdown from "react-markdown";
import { CodeBlock } from "./CodeBlock";

interface StreamingMessageProps {
  content: string;
}

export function StreamingMessage({ content }: StreamingMessageProps) {
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);

    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <div className="flex items-start gap-1">
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown
          components={{
            code({ inline, className, children, ...props }: any) {
              return (
                <CodeBlock inline={inline} className={className} {...props}>
                  {String(children).replace(/\n$/, "")}
                </CodeBlock>
              );
            },
            p: ({ children }) => (
              <div className="mb-4 last:mb-0">{children}</div>
            ),
          }}
        >
          {content || " "}
        </ReactMarkdown>
      </div>
      {showCursor && (
        <span className="mt-1 inline-block h-4 w-1 bg-current animate-pulse" />
      )}
    </div>
  );
}
