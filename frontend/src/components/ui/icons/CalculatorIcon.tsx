import React from "react";

export const CalculatorIcon: React.FC<{ className?: string }> = ({ className }) => (
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
      d="M15.75 15.75V18m-4.5-2.25v2.25m-4.5-2.25v2.25M9 9.75h.008v.008H9V9.75zm3.75 0h.008v.008h-.008V9.75zm3.75 0h.008v.008h-.008V9.75zM5.25 6H18.75a2.25 2.25 0 012.25 2.25v6.75a2.25 2.25 0 01-2.25-2.25H5.25a2.25 2.25 0 01-2.25-2.25V8.25a2.25 2.25 0 012.25-2.25z"
    />
  </svg>
);
