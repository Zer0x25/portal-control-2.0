import React from "react";

export const ClockIcon: React.FC<{ className?: string; fill?: string }> = ({
  className,
  fill = "currentColor",
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill={fill}
    className={className || "w-6 h-6"}
  >
    <path d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm0,18a8,8,0,1,1,8-8A8,8,0,0,1,12,20Zm4-9.58L12.5,12.25V7a1,1,0,0,0-2,0v5.75a1,1,0,0,0,.5.86l4,2.5a1,1,0,0,0,.5,1.36,1,1,0,0,0,1.36-.5A1,1,0,0,0,16,16.42Z" />
  </svg>
);
