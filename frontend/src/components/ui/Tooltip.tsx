import React, { useId, useState } from "react";
import { Z } from "../../constants/zScale";

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = "top",
  className = "",
}) => {
  const tooltipId = useId();
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isVisible = isHovered || isFocused;
  const child = React.Children.only(children);
  const childProps = child.props as React.HTMLAttributes<HTMLElement>;
  const descriptionIds = new Set(
    (childProps["aria-describedby"] ?? "").split(/\s+/).filter(Boolean),
  );
  descriptionIds.add(tooltipId);
  const trigger = React.cloneElement(
    child as React.ReactElement<React.HTMLAttributes<HTMLElement>>,
    {
      "aria-describedby": Array.from(descriptionIds).join(" "),
      onFocus: (event) => {
        childProps.onFocus?.(event);
        setIsFocused(true);
      },
      onBlur: (event) => {
        childProps.onBlur?.(event);
        setIsFocused(false);
      },
    },
  );

  const positionStyles = {
    top: "-top-2 left-1/2 -translate-x-1/2 -translate-y-full mb-2",
    bottom: "-bottom-2 left-1/2 -translate-x-1/2 translate-y-full mt-2",
    left: "-left-2 top-1/2 -translate-y-1/2 -translate-x-full mr-2",
    right: "-right-2 top-1/2 -translate-y-1/2 translate-x-full ml-2",
  };

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {trigger}
      <div
        id={tooltipId}
        role="tooltip"
        className={`
              absolute ${Z.modal} px-4 py-2.5
              bg-token-surface-card text-token-text-primary text-[11px] font-mono tracking-tight
              rounded-md border border-token-border-technical shadow-2xl
              max-w-[400px] w-max whitespace-normal wrap-break-word pointer-events-none
              transition-opacity duration-150
              ${isVisible ? "visible opacity-100" : "invisible opacity-0"}
              ${positionStyles[position]}
            `}
      >
        {content}
      </div>
    </div>
  );
};

export default Tooltip;
