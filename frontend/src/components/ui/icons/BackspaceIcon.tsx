import React from "react";

export const BackspaceIcon: React.FC<{ className?: string }> = ({ className }) => (
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
      d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59l6.375-6.375a1.125 1.125 0 011.59 0l6.375 6.375a1.125 1.125 0 010 1.59l-6.375 6.375a1.125 1.125 0 01-1.59 0z"
    />
  </svg>
);
