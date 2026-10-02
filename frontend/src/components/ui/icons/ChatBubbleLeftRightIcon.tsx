import React from "react";

export const ChatBubbleLeftRightIcon: React.FC<{ className?: string }> = ({ className }) => (
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
      d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.722.372c-1.131.113-2.097-.647-2.097-1.772V15.21a2.25 2.25 0 012.25-2.25h3.722zM7.5 12.45V15a2.25 2.25 0 002.25 2.25h3.75v-2.943c0-1.136.847-2.1 1.98-2.193l-3.722-.372a2.25 2.25 0 01-2.25-2.25V6.102c0-1.136-.847-2.1-1.98-2.193l-3.722-.372A2.25 2.25 0 003.75 6.102v4.286c0 1.136.847 2.1 1.98 2.193l3.722.372z"
    />
  </svg>
);
