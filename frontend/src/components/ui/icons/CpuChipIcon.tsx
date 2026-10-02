import React from "react";

export const CpuChipIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.25 3v1.5M4.5 8.25H3m1.5 7.5H3m7.5 5.25V19.5m7.5-11.25H21m-1.5 7.5H21m-8.25-12V3m0 18v-1.5M7.5 6.75h9a.75.75 0 0 1 .75.75v9a.75.75 0 0 1-.75.75h-9a.75.75 0 0 1-.75-.75v-9a.75.75 0 0 1 .75-.75ZM9 9h6v6H9V9Z"
    />
  </svg>
);
