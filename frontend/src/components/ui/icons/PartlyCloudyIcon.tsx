import React from "react";

export const PartlyCloudyIcon: React.FC<{ className?: string }> = ({ className }) => (
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
      d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.5 4.5 0 0 0 2.25 15Z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 2.25a.75.75 0 0 1 .75.75v.01a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75Zm3.032 3.032a.75.75 0 0 1 .028 1.06l-.028.028-1.06 1.06a.75.75 0 0 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06.028Zm-6.064 0a.75.75 0 0 1 1.06-.028l.028.028 1.06 1.06a.75.75 0 0 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 .028-1.06Z"
    />
  </svg>
);
