import React from "react";

export const WrenchScrewdriverIcon: React.FC<{ className?: string }> = ({ className }) => (
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
      d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.83-5.83m0 0a2.963 2.963 0 00-2.292-2.292 2.963 2.963 0 00-2.292 2.292m0 0L4.75 5.25A2.652 2.652 0 001 9a2.652 2.652 0 003.75 3.75l5.83 5.83m0 0a2.963 2.963 0 012.292 2.292m2.292-2.292a2.963 2.963 0 012.292 2.292M15.75 3.75l-3.17 3.17a3 3 0 000 4.24l3.17 3.17m0 0a3 3 0 010 4.24l-3.17 3.17m0-13.41L15.75 3.75m0 0l3.17 3.17a3 3 0 010 4.24l-3.17 3.17"
    />
  </svg>
);
