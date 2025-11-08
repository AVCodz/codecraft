/**
 * useRotatingText - Hook to rotate through text messages at intervals
 * Used for dynamic loading indicators
 */
import { useState, useEffect } from "react";

export function useRotatingText(messages: string[], intervalMs: number = 3000) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [messages.length, intervalMs]);

  return messages[currentIndex];
}
