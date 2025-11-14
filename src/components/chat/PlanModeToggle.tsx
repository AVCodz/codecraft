"use client";

import { ClipboardList, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/helpers";
import { Tooltip } from "@/components/ui/Tooltip";

interface PlanModeToggleProps {
  value: boolean;
  onChange: (nextValue: boolean) => void;
  size?: "sm" | "md";
  className?: string;
}

const sizeStyles = {
  sm: {
    container: "px-2 py-1 text-[11px]",
    iconWrap: "h-7 w-7",
    textGap: "gap-1",
  },
  md: {
    container: "px-3 py-2 text-sm",
    iconWrap: "h-9 w-9",
    textGap: "gap-1.5",
  },
};

export function PlanModeToggle({
  value,
  onChange,
  size = "md",
  className,
}: PlanModeToggleProps) {
  const styles = sizeStyles[size];

  return (
    <Tooltip
      label={
        value
          ? "Planning only uses read/search/web tools."
          : "Switch to plan mode to outline steps before building."
      }
      position="top"
    >
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          "group flex items-center rounded-2xl border transition-colors",
          styles.container,
          value
            ? "border-primary/70 bg-primary/10 text-primary"
            : "border-border bg-muted/60 text-muted-foreground hover:text-foreground",
          className
        )}
      >
        <span
          className={cn(
            "flex items-center justify-center rounded-xl bg-background/70 shadow-sm",
            styles.iconWrap
          )}
        >
          {value ? (
            <ClipboardList className="h-4 w-4" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
        </span>
        <span className={cn("ml-2 flex flex-col text-left", styles.textGap)}>
          <span className="text-[0.65rem] font-semibold uppercase tracking-wide">
            Plan mode
          </span>
          <span className="text-[0.7rem] opacity-80">
            {value ? "Outlining next steps" : "Ready to build"}
          </span>
        </span>
        <span className="ml-auto">
          <span
            className={cn(
              "relative flex h-5 w-9 items-center rounded-full bg-foreground/20",
              value && "bg-primary/70"
            )}
          >
            <motion.span
              layout
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="h-4 w-4 rounded-full bg-background shadow"
              animate={{ x: value ? 16 : 2 }}
            />
          </span>
        </span>
      </button>
    </Tooltip>
  );
}
