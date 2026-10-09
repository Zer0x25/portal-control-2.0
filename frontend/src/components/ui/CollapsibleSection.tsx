import React, { useState, ReactNode } from "react";
import { ChevronDownIcon } from "./icons/index";

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  startOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  startOpen = false,
  onToggle,
}) => {
  const [isOpen, setIsOpen] = useState(startOpen);

  const handleToggle = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    if (onToggle) {
      onToggle(newIsOpen);
    }
  };

  const headerBaseClasses =
    "flex justify-between items-center w-full p-4 text-lg font-semibold text-left text-sap-blue dark:text-sap-light-blue bg-token-surface-card shadow-md cursor-pointer hover:bg-token-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-sap-blue";
  const headerOpenClasses = "rounded-t-lg border-b border-token-border-technical";
  const headerClosedClasses = "rounded-lg";
  const contentClasses = "bg-token-surface-card shadow-md rounded-b-lg overflow-hidden";

  return (
    <div>
      <div
        className={`${headerBaseClasses} ${isOpen ? headerOpenClasses : headerClosedClasses}`}
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => {
          if (e.key === "Enter" || e.key === " ") handleToggle();
        }}
        aria-expanded={isOpen}
        aria-controls={`collapsible-content-${title}`}
      >
        <span>{title}</span>
        <ChevronDownIcon
          className={`w-5 h-5 transform transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </div>
      {isOpen && (
        <div id={`collapsible-content-${title}`} className={contentClasses}>
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleSection;
