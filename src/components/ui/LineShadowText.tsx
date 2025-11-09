/**
 * LineShadowText - Animated line shadow text effect
 * Creates a dynamic line pattern shadow effect on text
 * Usage: <LineShadowText shadowColor="#ffffff">Your Text</LineShadowText>
 */
"use client";

import { motion, MotionProps } from "framer-motion";

interface LineShadowTextProps
  extends Omit<React.HTMLAttributes<HTMLElement>, keyof MotionProps>,
    MotionProps {
  shadowColor?: string;
  as?: React.ElementType;
  children: string;
}

export function LineShadowText({
  children,
  shadowColor = "#000000",
  className = "",
  as: Component = "span",
  ...props
}: LineShadowTextProps) {
  const MotionComponent = motion.create(Component as React.ElementType);
  const content = typeof children === "string" ? children : null;

  if (!content) {
    throw new Error("LineShadowText only accepts string content");
  }

  return (
    <MotionComponent
      style={
        {
          "--shadow-color": shadowColor,
        } as React.CSSProperties
      }
      className={`line-shadow-text ${className}`}
      data-text={content}
      {...props}
    >
      {content}
    </MotionComponent>
  );
}
