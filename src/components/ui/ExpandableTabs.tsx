"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { IconType } from "react-icons";

interface Tab {
  title: string;
  icon: LucideIcon | IconType;
  type?: never;
}

interface Separator {
  type: "separator";
  title?: never;
  icon?: never;
}

type TabItem = Tab | Separator;

interface ExpandableTabsProps {
  tabs: TabItem[];
  className?: string;
  activeColor?: string;
  onChange?: (index: number | null) => void;
  selected?: number | null;
}

const buttonVariants = {
  initial: {
    gap: 0,
    paddingLeft: ".375rem",
    paddingRight: ".375rem",
  },
  animate: (isSelected: boolean) => ({
    gap: isSelected ? ".375rem" : 0,
    paddingLeft: isSelected ? ".75rem" : ".375rem",
    paddingRight: isSelected ? ".75rem" : ".375rem",
  }),
};

const spanVariants = {
  initial: { width: 0, opacity: 0 },
  animate: { width: "auto", opacity: 1 },
  exit: { width: 0, opacity: 0 },
};

const transition = {
  delay: 0.05,
  type: "spring" as const,
  bounce: 0,
  duration: 0.35,
};

export function ExpandableTabs({
  tabs,
  className = "",
  activeColor = "text-foreground",
  onChange,
  selected: controlledSelected,
}: ExpandableTabsProps) {
  const [internalSelected, setInternalSelected] = React.useState<number | null>(
    null
  );
  const outsideClickRef = React.useRef<HTMLDivElement>(null);

  const selected =
    controlledSelected !== undefined ? controlledSelected : internalSelected;

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        outsideClickRef.current &&
        !outsideClickRef.current.contains(event.target as Node)
      ) {
        if (controlledSelected === undefined) {
          setInternalSelected(null);
        }
        onChange?.(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onChange, controlledSelected]);

  const handleSelect = (index: number) => {
    if (controlledSelected === undefined) {
      setInternalSelected(index);
    }
    onChange?.(index);
  };

  const Separator = () => (
    <div className="mx-0.5 h-[18px] w-[1px] bg-border" aria-hidden="true" />
  );

  return (
    <div
      ref={outsideClickRef}
      className={`flex flex-wrap items-center gap-1 rounded-xl border bg-background p-1 shadow-sm ${className}`}
    >
      {tabs.map((tab, index) => {
        if (tab.type === "separator") {
          return <Separator key={`separator-${index}`} />;
        }

        const tabItem = tab as Tab;
        const Icon = tabItem.icon;

        return (
          <motion.button
            key={tabItem.title}
            variants={buttonVariants}
            initial={false}
            animate="animate"
            custom={selected === index}
            onClick={() => handleSelect(index)}
            transition={transition}
            className={`relative flex items-center rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-300 ${
              selected === index
                ? `bg-muted ${activeColor}`
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon size={16} />
            <AnimatePresence initial={false}>
              {selected === index && (
                <motion.span
                  variants={spanVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={transition}
                  className="overflow-hidden text-xs"
                >
                  {tabItem.title}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}
