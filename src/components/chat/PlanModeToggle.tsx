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

type PlanModeToggleSize = NonNullable<PlanModeToggleProps["size"]>;
type SizeStyleConfig = {
  container: string;
  iconWrap: string;
  textGap: string;
  subtext: string;
  switchTrack: string;
  switchHandle: string;
  label: string;
};

const sizeStyles: Record<PlanModeToggleSize, SizeStyleConfig> = {
  sm: {
    container: "px-2.5 py-1.5 text-[11px]",
    iconWrap: "h-8 w-8",
    textGap: "gap-0.5",
    subtext: "text-[10px]",
    switchTrack: "h-5 w-9",
    switchHandle: "h-4 w-4",
    label: "text-[10px]",
  },
  md: {
    container: "px-4 py-2.5 text-[12px]",
    iconWrap: "h-10 w-10",
    textGap: "gap-1",
    subtext: "text-[11px]",
    switchTrack: "h-6 w-11",
    switchHandle: "h-5 w-5",
    label: "text-[11px]",
  },
};

const handleOffsets: Record<PlanModeToggleSize, number> = {
  sm: 20,
  md: 24,
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
        aria-pressed={value}
        className={cn(
          "group relative flex items-center gap-3 rounded-full border border-white/5 bg-gradient-to-r from-background/95 via-background/80 to-background/60 text-left shadow-[0_1px_0_rgba(255,255,255,0.03)] transition-all",
          styles.container,
          value
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground",
          className
        )}
      >
        <span
          className={cn(
            "flex items-center justify-center rounded-full border border-white/5 bg-gradient-to-br from-background/60 to-background/20 shadow-inner transition-colors",
            value && "border-primary/40 bg-primary/10",
            styles.iconWrap
          )}
        >
          {value ? (
            <ClipboardList className="h-4 w-4" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
        </span>
        <span className={cn("flex flex-col", styles.textGap)}>
          <span
            className={cn(
              "font-semibold uppercase tracking-[0.18em] text-muted-foreground/80 transition-colors",
              value && "text-primary",
              styles.label
            )}
          >
            Plan mode
          </span>
          <span className={cn("font-medium text-foreground", styles.subtext)}>
            {value ? "Outlining next steps" : "Ready to build"}
          </span>
        </span>
        <span className="ml-auto">
          <span
            className={cn(
              "relative flex items-center rounded-full bg-foreground/15 px-0.5 transition-colors",
              value && "bg-primary/50",
              styles.switchTrack
            )}
          >
            <motion.span
              layout
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={cn(
                "rounded-full bg-background shadow-lg ring-1 ring-black/10",
                styles.switchHandle
              )}
              animate={{ x: value ? handleOffsets[size] : 0 }}
            />
          </span>
        </span>
      </button>
    </Tooltip>
  );
}
