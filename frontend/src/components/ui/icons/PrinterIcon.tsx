import React from "react";

export const PrinterIcon: React.FC<{ className?: string }> = ({ className }) => (
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
      d="M6.72 13.89l-4.72-4.72a.75.75 0 011.06-1.06l4.72 4.72H12m-.3-2.04v7.5M11 18h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.418-3.582-8-8-8a8.003 8.003 0 00-7.393 4.908c-.015.034-.023.07-.023.107v6.61c0 .621.504 1.125 1.125 1.125H5"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17.25 12V5.25m0 0h3.375c.621 0 1.125.504 1.125 1.125v10.5c0 .621-.504 1.125-1.125 1.125H16.5M16.5 18h1.5m-3-13.125v13.125M11.25 15h3m-3-3h3"
    />
  </svg>
);
