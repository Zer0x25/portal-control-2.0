import React from "react";

export const BeakerIcon: React.FC<{ className?: string }> = ({ className }) => (
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
      d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c.239.023.48.04.72.055a11.94 11.94 0 017.253 2.623m-7.253 2.623L5.15 6.21m4.6 2.623V3.104m6.15 3.104a11.943 11.943 0 01-1.54 6.22l-3.3 1.925a2.25 2.25 0 01-2.15 0l-3.3-1.925a11.943 11.943 0 01-1.54-6.22m11.9 0a9 9 0 11-11.9 0m11.9 0h.008v.008h-.008V6.21z"
    />
  </svg>
);
