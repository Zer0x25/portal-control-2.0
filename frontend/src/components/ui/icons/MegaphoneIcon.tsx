import React from "react";

export const MegaphoneIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
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
      d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.007.51.011.77.011h3.75c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125h-3.75c-.26 0-.517.004-.77.011m0-9.18c.253-.007.51-.011.77-.011h3.75c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-3.75c-.26 0-.517-.004-.77-.011m0 9.18V5.07m0 10.77a21.407 21.407 0 0 1 0-10.77M15.75 9c.142 0 .28.013.414.039.505.096.836.592.836 1.11v2.702c0 .518-.331 1.014-.836 1.11a1.91 1.91 0 0 1-.414.039"
    />
  </svg>
);
