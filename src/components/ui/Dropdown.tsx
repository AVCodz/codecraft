/**
 * Dropdown - Custom dropdown menu component
 * Reusable dropdown with trigger, items, and separator components
 * Features: Click-outside detection, left/right alignment, destructive variant
 * Used in: Settings menu, user dropdown, and context menus
 */
"use client";

import * as React from "react";
import { cn } from "@/lib/utils/helpers";

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
  onOpenChange?: (open: boolean) => void;
}

export function Dropdown({ trigger, children, align = "left", className, onOpenChange }: DropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const handleOpenChange = React.useCallback((open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  }, [onOpenChange]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        handleOpenChange(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, handleOpenChange]);

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => handleOpenChange(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-2 min-w-[200px] rounded-md border border-border bg-background shadow-lg",
            align === "right" ? "right-0" : "left-0",
            className
          )}
        >
          <div className="py-1" onClick={() => handleOpenChange(false)}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
  className?: string;
}

export function DropdownItem({ children, onClick, variant = "default", disabled, className }: DropdownItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2",
        variant === "destructive" && "text-destructive hover:bg-destructive/10",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-border" />;
}
