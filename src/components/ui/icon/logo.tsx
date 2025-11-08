/**
 * Logo - VibeIt brand logo component
 * Reusable SVG logo that can be used anywhere with customizable size
 * Usage: <Logo size={32} className="text-primary" />
 */
import React from "react";

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({
  size = 32,
  className = "",
}: LogoProps): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Black circle background */}
      <circle cx="16" cy="16" r="16" fill="#000000" />

      {/* White heart shape */}
      <path
        d="M10.842 6.84c-.672-.273-1.445.115-1.996.588-1.453 1.229-2.631 2.609-2.285 4.64.167.978 1.673 4.137 3.284 7.276l.334.649c1.786 3.448 3.595 6.687 3.767 6.757 0 0 11.283-14.33 11.505-15.073.176-.592-.035-2.724-2.077-4.252-.582-.436-1.345-.79-1.902-.588-1.631.589-6.174 7.048-6.174 7.048l-.02-.04-.098-.195a76.543 76.543 0 00-1.788-3.335l-.269-.463c-.857-1.457-1.759-2.8-2.28-3.011z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export default Logo;
