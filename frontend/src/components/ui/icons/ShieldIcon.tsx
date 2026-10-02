import React from "react";

export const ShieldIcon: React.FC<{ className?: string }> = ({ className }) => (
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
      d="M12 21.75c2.436-1.122 4.636-2.94 6.516-5.42 1.88-2.48 2.984-5.468 2.984-8.58v-3.75L12 1.5 2.499 4.5v3.75c0 3.112 1.104 6.1 2.984 8.58 1.88 2.48 4.08 4.298 6.517 5.42z"
    />
  </svg>
);
