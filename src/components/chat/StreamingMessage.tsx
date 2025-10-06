'use client';

import { useState, useEffect } from 'react';

interface StreamingMessageProps {
  content: string;
}

export function StreamingMessage({ content }: StreamingMessageProps) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  // Simulate streaming effect
  useEffect(() => {
    if (content.length === 0) {
      setDisplayedContent('');
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
    }, 20); // Adjust speed as needed

    return () => clearInterval(interval);
  }, [content]);

  // Cursor blinking effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);

    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <div className="whitespace-pre-wrap">
      {displayedContent}
      {showCursor && (
        <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse" />
      )}
    </div>
  );
}
