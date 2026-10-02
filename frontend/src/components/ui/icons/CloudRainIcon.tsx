import React from "react";

export const CloudRainIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className || "w-6 h-6"}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.5 21l-3-3m0 0l3-3m-3 3h6m-1.25-1.5a4.5 4.5 0 01-8.5-1.5c0-1.563.74-2.937 1.875-3.812a4.504 4.504 0 017.313-1.687A4.5 4.5 0 0118.25 10.5c0 2.485-2.015 4.5-4.5 4.5H9.75Z"
    />
  </svg>
);
