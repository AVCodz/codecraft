/**
 * AnimatedShinyText - Animated text with shiny/shimmer effect
 * Creates a moving shine/shimmer effect across text
 * Usage: <AnimatedShinyText shimmerWidth={100}>Your Text</AnimatedShinyText>
 */
import { ComponentPropsWithoutRef, CSSProperties, FC } from "react";

export interface AnimatedShinyTextProps
  extends ComponentPropsWithoutRef<"span"> {
  shimmerWidth?: number;
}

export const AnimatedShinyText: FC<AnimatedShinyTextProps> = ({
  children,
  className = "",
  shimmerWidth = 100,
  ...props
}) => {
  return (
    <span
      style={
        {
          "--shiny-width": `${shimmerWidth}px`,
        } as CSSProperties
      }
      className={`animate-shiny-text bg-gradient-to-r from-transparent  via-white via-white/70% to-white/50% bg-clip-text text-white/50 bg-no-repeat ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
