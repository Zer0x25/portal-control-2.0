import React, { useState } from "react";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = "top",
  className = "",
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionStyles = {
    top: "-top-2 left-1/2 -translate-x-1/2 -translate-y-full mb-2",
    bottom: "-bottom-2 left-1/2 -translate-x-1/2 translate-y-full mt-2",
    left: "-left-2 top-1/2 -translate-y-1/2 -translate-x-full mr-2",
    right: "-right-2 top-1/2 -translate-y-1/2 translate-x-full ml-2",
  };

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={`
              absolute z-100 px-4 py-2.5
              bg-token-surface-card text-token-text-primary text-[11px] font-mono tracking-tight
              rounded-md border border-token-border-technical shadow-2xl
              max-w-[400px] w-max whitespace-normal wrap-break-word pointer-events-none
              animate-in fade-in zoom-in-95
              ${positionStyles[position]}
            `}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
