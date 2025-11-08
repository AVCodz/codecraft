"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TooltipProps {
  children: React.ReactElement;
  label: string;
  disabled?: boolean;
  position?: "top" | "bottom";
}

const springConfig = {
  duration: 0.2,
  ease: "easeInOut" as const,
};

export function Tooltip({ children, label, disabled = false, position = "bottom" }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [tooltipPosition, setTooltipPosition] = React.useState({ left: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);
  const tooltipRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (isVisible && containerRef.current && tooltipRef.current && triggerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      const left = triggerRect.left - containerRect.left + (triggerRect.width - tooltipRect.width) / 2;

      setTooltipPosition({
        left: Math.max(0, Math.min(left, containerRect.width - tooltipRect.width)),
      });
    }
  }, [isVisible, label]);

  const clonedChild = React.cloneElement(children as React.ReactElement<any>, {
    ref: triggerRef,
    onMouseEnter: (e: React.MouseEvent) => {
      if (!disabled) setIsVisible(true);
      (children.props as any)?.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      setIsVisible(false);
      (children.props as any)?.onMouseLeave?.(e);
    },
  });

  return (
    <div ref={containerRef} className="relative inline-block">
      {clonedChild}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: position === "top" ? 5 : -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: position === "top" ? 5 : -5 }}
            transition={springConfig}
            className={`absolute left-1/2 -translate-x-1/2 pointer-events-none z-50 ${
              position === "top" 
                ? "bottom-full mb-2" 
                : "top-full mt-2"
            }`}
          >
            <div
              ref={tooltipRef}
              className="h-7 px-3 rounded-lg inline-flex justify-center items-center overflow-hidden bg-background/95 backdrop-blur border border-border/50 shadow-lg whitespace-nowrap"
            >
              <p className="text-xs font-medium leading-tight">
                {label}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
