"use client";

import { FaLightbulb } from "react-icons/fa";
import { VscLightbulbSparkle } from "react-icons/vsc";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/helpers";
import { Tooltip } from "@/components/ui/Tooltip";
import { TbBulbFilled } from "react-icons/tb";

interface PlanModeToggleProps {
  value: boolean;
  onChange: (nextValue: boolean) => void;
  size?: "sm" | "md";
  className?: string;
}

export function PlanModeToggle({
  value,
  onChange,
  className,
}: PlanModeToggleProps) {
  return (
    <Tooltip
      label={value ? "Plan Mode Active" : "Activate Plan Mode"}
      position="top"
    >
      <motion.button
        type="button"
        onClick={() => onChange(!value)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 17,
        }}
        className={cn(
          "flex cursor-pointer items-center justify-center rounded-xl p-2 transition-colors",
          value ? "bg-primary text-primary-foreground" : "bg-muted/80",
          className
        )}
      >
        {value ? (
          <TbBulbFilled className="w-5 h-5 mr-1" />
        ) : (
          <FaLightbulb className="w-4 h-4 mr-2" />
        )}
        Plan
      </motion.button>
    </Tooltip>
  );
}
